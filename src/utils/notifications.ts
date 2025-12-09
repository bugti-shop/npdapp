import { LocalNotifications, LocalNotificationSchema, ActionPerformed } from '@capacitor/local-notifications';
import { TodoItem, Note } from '@/types/note';
import { RepeatSettings, RepeatFrequency } from '@/components/TaskDateTimePage';
import { addMinutes, addHours, addDays, addWeeks, addMonths, addYears } from 'date-fns';

export interface NotificationData {
  taskId?: string;
  noteId?: string;
  type: 'task' | 'note';
  recurring?: boolean;
  recurringType?: string;
  originalTitle?: string;
  originalBody?: string;
}

export type SnoozeOption = '5min' | '15min' | '1hour';

export const SNOOZE_ACTION_TYPE_ID = 'SNOOZE_ACTION_TYPE';

export class NotificationManager {
  private static instance: NotificationManager;
  private permissionGranted = false;
  private initialized = false;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Request permissions
      await this.requestPermissions();

      // Register action types for snooze
      await this.registerActionTypes();

      // Set up notification listeners
      await this.setupListeners();

      this.initialized = true;
      console.log('NotificationManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationManager:', error);
    }
  }

  private async registerActionTypes(): Promise<void> {
    try {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: SNOOZE_ACTION_TYPE_ID,
            actions: [
              {
                id: 'snooze_5min',
                title: 'Snooze 5 min',
              },
              {
                id: 'snooze_15min',
                title: 'Snooze 15 min',
              },
              {
                id: 'snooze_1hour',
                title: 'Snooze 1 hour',
              },
              {
                id: 'dismiss',
                title: 'Dismiss',
                destructive: true,
              },
            ],
          },
        ],
      });
      console.log('Notification action types registered');
    } catch (error) {
      console.error('Error registering action types:', error);
    }
  }

  private async setupListeners(): Promise<void> {
    try {
      // Listen for notification received
      await LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('Notification received:', notification);
        this.handleNotificationReceived(notification);
      });

      // Listen for notification action performed (user tapped on notification or action button)
      await LocalNotifications.addListener('localNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Notification action performed:', action);
        this.handleNotificationAction(action);
      });

      console.log('Notification listeners set up successfully');
    } catch (error) {
      console.error('Error setting up notification listeners:', error);
    }
  }

  private handleNotificationReceived(notification: LocalNotificationSchema): void {
    // Store notification in history
    const history = JSON.parse(localStorage.getItem('notificationHistory') || '[]');
    history.unshift({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      timestamp: new Date().toISOString(),
      read: false,
      extra: notification.extra,
    });
    // Keep only last 100 notifications
    localStorage.setItem('notificationHistory', JSON.stringify(history.slice(0, 100)));
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new CustomEvent('notificationReceived', { detail: notification }));
  }

  private async handleNotificationAction(action: ActionPerformed): Promise<void> {
    const notification = action.notification;
    const actionId = action.actionId;
    const extra = notification.extra as NotificationData | undefined;

    // Handle snooze actions
    if (actionId.startsWith('snooze_')) {
      const snoozeType = actionId.replace('snooze_', '') as SnoozeOption;
      await this.snoozeNotification(notification, snoozeType);
      return;
    }

    // Handle dismiss action
    if (actionId === 'dismiss') {
      // Just mark as read and don't reschedule
      this.markNotificationAsRead(notification.id);
      return;
    }

    // Handle tap on notification (open app)
    if (extra?.taskId) {
      window.dispatchEvent(new CustomEvent('taskNotificationTapped', { detail: { taskId: extra.taskId } }));
    } else if (extra?.noteId) {
      window.dispatchEvent(new CustomEvent('noteNotificationTapped', { detail: { noteId: extra.noteId } }));
    }

    // Mark as read in history
    this.markNotificationAsRead(notification.id);
  }

  async snoozeNotification(notification: LocalNotificationSchema, snoozeOption: SnoozeOption): Promise<void> {
    try {
      let snoozeTime: Date;
      let snoozeLabel: string;

      switch (snoozeOption) {
        case '5min':
          snoozeTime = addMinutes(new Date(), 5);
          snoozeLabel = '5 minutes';
          break;
        case '15min':
          snoozeTime = addMinutes(new Date(), 15);
          snoozeLabel = '15 minutes';
          break;
        case '1hour':
          snoozeTime = addHours(new Date(), 1);
          snoozeLabel = '1 hour';
          break;
        default:
          snoozeTime = addMinutes(new Date(), 5);
          snoozeLabel = '5 minutes';
      }

      const extra = notification.extra as NotificationData | undefined;
      const snoozeNotificationId = Date.now();

      await LocalNotifications.schedule({
        notifications: [
          {
            id: snoozeNotificationId,
            title: `⏰ Snoozed: ${notification.title || 'Reminder'}`,
            body: notification.body || '',
            schedule: { at: snoozeTime },
            sound: undefined,
            attachments: undefined,
            actionTypeId: SNOOZE_ACTION_TYPE_ID,
            extra: {
              ...extra,
              originalTitle: notification.title,
              originalBody: notification.body,
              snoozedFrom: notification.id,
            } as NotificationData,
          },
        ],
      });

      // Update history to show it was snoozed
      const history = JSON.parse(localStorage.getItem('notificationHistory') || '[]');
      const updatedHistory = history.map((item: any) =>
        item.id === notification.id 
          ? { ...item, snoozed: true, snoozedUntil: snoozeTime.toISOString(), snoozeLabel }
          : item
      );
      localStorage.setItem('notificationHistory', JSON.stringify(updatedHistory));

      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('notificationSnoozed', { 
        detail: { 
          originalId: notification.id, 
          newId: snoozeNotificationId, 
          snoozeTime,
          snoozeLabel 
        } 
      }));

      console.log(`Notification snoozed for ${snoozeLabel}`);
    } catch (error) {
      console.error('Error snoozing notification:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const result = await LocalNotifications.requestPermissions();
      this.permissionGranted = result.display === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      const result = await LocalNotifications.checkPermissions();
      this.permissionGranted = result.display === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  private calculateReminderTime(baseDate: Date, reminderOffset: string): Date {
    switch (reminderOffset) {
      case '5min':
        return addMinutes(baseDate, -5);
      case '10min':
        return addMinutes(baseDate, -10);
      case '15min':
        return addMinutes(baseDate, -15);
      case '30min':
        return addMinutes(baseDate, -30);
      case '1hour':
        return addHours(baseDate, -1);
      case '2hours':
        return addHours(baseDate, -2);
      case '1day':
        return addDays(baseDate, -1);
      default:
        return baseDate;
    }
  }

  private getNextOccurrence(baseDate: Date, frequency: RepeatFrequency, interval: number, occurrence: number): Date {
    const totalInterval = interval * occurrence;
    
    switch (frequency) {
      case 'hour':
        return addHours(baseDate, totalInterval);
      case 'daily':
        return addDays(baseDate, totalInterval);
      case 'weekly':
        return addWeeks(baseDate, totalInterval);
      case 'monthly':
        return addMonths(baseDate, totalInterval);
      case 'yearly':
        return addYears(baseDate, totalInterval);
      default:
        return baseDate;
    }
  }

  async scheduleTaskReminder(
    task: TodoItem,
    reminderOffset?: string,
    repeatSettings?: RepeatSettings
  ): Promise<number[]> {
    if (!task.dueDate && !task.reminderTime) return [];

    const hasPermission = await this.checkPermissions();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        throw new Error('Notification permissions not granted');
      }
    }

    try {
      await this.cancelTaskReminder(task.id);

      const baseNotificationId = parseInt(task.id.slice(0, 8), 16) || Date.now();
      const baseDate = task.reminderTime 
        ? new Date(task.reminderTime) 
        : new Date(task.dueDate!);
      
      const notificationIds: number[] = [];
      const notifications: LocalNotificationSchema[] = [];

      // Calculate reminder time based on offset
      const reminderTime = reminderOffset 
        ? this.calculateReminderTime(baseDate, reminderOffset)
        : baseDate;

      if (repeatSettings && repeatSettings.frequency) {
        // Calculate how many occurrences to schedule
        let maxOccurrences = 30; // Default
        
        if (repeatSettings.endsType === 'after_occurrences' && repeatSettings.endsAfterOccurrences) {
          maxOccurrences = repeatSettings.endsAfterOccurrences;
        } else if (repeatSettings.endsType === 'on_date' && repeatSettings.endsOnDate) {
          // Calculate occurrences until end date
          const now = new Date();
          const endDate = new Date(repeatSettings.endsOnDate);
          let count = 0;
          let checkDate = reminderTime;
          
          while (checkDate <= endDate && count < 365) {
            if (checkDate > now) count++;
            checkDate = this.getNextOccurrence(reminderTime, repeatSettings.frequency, repeatSettings.interval, count + 1);
          }
          maxOccurrences = Math.min(count, 365);
        }

        for (let i = 0; i < maxOccurrences; i++) {
          const occurrenceDate = this.getNextOccurrence(reminderTime, repeatSettings.frequency, repeatSettings.interval, i);
          
          // For weekly repeats, check if day is in selected days
          if (repeatSettings.frequency === 'weekly' && repeatSettings.weeklyDays && repeatSettings.weeklyDays.length > 0) {
            if (!repeatSettings.weeklyDays.includes(occurrenceDate.getDay())) {
              continue;
            }
          }

          // For monthly repeats, set specific day
          if (repeatSettings.frequency === 'monthly' && repeatSettings.monthlyDay) {
            occurrenceDate.setDate(repeatSettings.monthlyDay);
          }

          if (occurrenceDate > new Date()) {
            const notificationId = baseNotificationId + i;
            notificationIds.push(notificationId);

            const frequencyLabel = repeatSettings.frequency.charAt(0).toUpperCase() + repeatSettings.frequency.slice(1);
            
            notifications.push({
              id: notificationId,
              title: `Task Reminder (${frequencyLabel})`,
              body: task.text,
              schedule: { at: occurrenceDate },
              sound: undefined,
              attachments: undefined,
              actionTypeId: SNOOZE_ACTION_TYPE_ID,
              extra: {
                taskId: task.id,
                type: 'task',
                recurring: true,
                recurringType: repeatSettings.frequency,
              } as NotificationData,
            });
          }
        }
      } else {
        // Single notification
        if (reminderTime > new Date()) {
          notificationIds.push(baseNotificationId);
          notifications.push({
            id: baseNotificationId,
            title: 'Task Reminder',
            body: task.text,
            schedule: { at: reminderTime },
            sound: undefined,
            attachments: undefined,
            actionTypeId: SNOOZE_ACTION_TYPE_ID,
            extra: {
              taskId: task.id,
              type: 'task',
            } as NotificationData,
          });
        }
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
        console.log(`Scheduled ${notifications.length} notification(s) for task: ${task.text}`);
      }

      return notificationIds;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  async scheduleNoteReminder(note: Note): Promise<number[]> {
    if (!note.reminderTime || !note.reminderEnabled) return [];

    const hasPermission = await this.checkPermissions();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        throw new Error('Notification permissions not granted');
      }
    }

    try {
      await this.cancelNoteReminder(note.id);

      const baseNotificationId = parseInt(note.id.slice(0, 8), 16) || Date.now();
      const reminderDate = new Date(note.reminderTime);
      const notificationIds: number[] = [];
      const notifications: LocalNotificationSchema[] = [];

      const recurring = note.reminderRecurring && note.reminderRecurring !== 'none';
      const maxOccurrences = recurring ? 30 : 1;

      for (let i = 0; i < maxOccurrences; i++) {
        const occurrenceDate = new Date(reminderDate);

        if (note.reminderRecurring === 'daily') {
          occurrenceDate.setDate(occurrenceDate.getDate() + i);
        } else if (note.reminderRecurring === 'weekly') {
          occurrenceDate.setDate(occurrenceDate.getDate() + (i * 7));
        } else if (note.reminderRecurring === 'monthly') {
          occurrenceDate.setMonth(occurrenceDate.getMonth() + i);
        }

        if (occurrenceDate > new Date()) {
          const notificationId = baseNotificationId + i;
          notificationIds.push(notificationId);

          notifications.push({
            id: notificationId,
            title: recurring
              ? `Note Reminder (${note.reminderRecurring?.charAt(0).toUpperCase()}${note.reminderRecurring?.slice(1)})`
              : 'Note Reminder',
            body: note.title || 'You have a note reminder',
            schedule: { at: occurrenceDate },
            sound: undefined,
            attachments: undefined,
            actionTypeId: SNOOZE_ACTION_TYPE_ID,
            extra: {
              noteId: note.id,
              type: 'note',
              recurring,
              recurringType: note.reminderRecurring,
            } as NotificationData,
          });
        }
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
        console.log(`Scheduled ${notifications.length} notification(s) for note: ${note.title}`);
      }

      return notificationIds;
    } catch (error) {
      console.error('Error scheduling note notification:', error);
      throw error;
    }
  }

  async cancelTaskReminder(taskId: string, notificationIds?: number[]): Promise<void> {
    try {
      if (notificationIds && notificationIds.length > 0) {
        await LocalNotifications.cancel({
          notifications: notificationIds.map(id => ({ id }))
        });
      } else {
        const baseNotificationId = parseInt(taskId.slice(0, 8), 16) || Date.now();
        const idsToCancel = [];
        for (let i = 0; i < 365; i++) {
          idsToCancel.push({ id: baseNotificationId + i });
        }
        await LocalNotifications.cancel({ notifications: idsToCancel });
      }
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async cancelNoteReminder(noteId: string, notificationIds?: number[]): Promise<void> {
    try {
      if (notificationIds && notificationIds.length > 0) {
        await LocalNotifications.cancel({
          notifications: notificationIds.map(id => ({ id }))
        });
      } else {
        const baseNotificationId = parseInt(noteId.slice(0, 8), 16) || Date.now();
        const idsToCancel = [];
        for (let i = 0; i < 100; i++) {
          idsToCancel.push({ id: baseNotificationId + i });
        }
        await LocalNotifications.cancel({ notifications: idsToCancel });
      }
    } catch (error) {
      console.error('Error canceling note notification:', error);
    }
  }

  async cancelAllReminders(): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  async getPendingNotifications(): Promise<LocalNotificationSchema[]> {
    try {
      const pending = await LocalNotifications.getPending();
      return pending.notifications;
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }

  async rescheduleAllTasks(tasks: TodoItem[]): Promise<void> {
    await this.cancelAllReminders();
    for (const task of tasks) {
      if ((task.reminderTime || task.dueDate) && !task.completed) {
        try {
          await this.scheduleTaskReminder(task);
        } catch (error) {
          console.error(`Failed to schedule reminder for task ${task.id}:`, error);
        }
      }
    }
  }

  getNotificationHistory(): any[] {
    return JSON.parse(localStorage.getItem('notificationHistory') || '[]');
  }

  clearNotificationHistory(): void {
    localStorage.setItem('notificationHistory', JSON.stringify([]));
  }

  markNotificationAsRead(notificationId: number): void {
    const history = JSON.parse(localStorage.getItem('notificationHistory') || '[]');
    const updatedHistory = history.map((item: any) =>
      item.id === notificationId ? { ...item, read: true } : item
    );
    localStorage.setItem('notificationHistory', JSON.stringify(updatedHistory));
  }
}

export const notificationManager = NotificationManager.getInstance();
