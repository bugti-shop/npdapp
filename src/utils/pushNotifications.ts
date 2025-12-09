import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { TodoItem, Note } from '@/types/note';

const PUSH_TOKEN_KEY = 'pushNotificationToken';
const PUSH_ENABLED_KEY = 'pushNotificationsEnabled';
const PUSH_TOPICS_KEY = 'pushNotificationTopics';

export interface PushNotificationPayload {
  type: 'task_reminder' | 'note_reminder' | 'sync_update' | 'general';
  taskId?: string;
  noteId?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export type PushTopic = 'task_reminders' | 'note_reminders' | 'updates' | 'tips';

class PushNotificationService {
  private static instance: PushNotificationService;
  private initialized = false;
  private token: string | null = null;
  private listeners: ((notification: PushNotificationSchema) => void)[] = [];

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications are only available on native platforms');
      // For web, we can use service workers for web push (optional enhancement)
      return false;
    }

    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        // Request permissions
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') {
          console.log('Push notification permission not granted');
          return false;
        }
      } else if (permStatus.receive !== 'granted') {
        console.log('Push notification permission denied');
        return false;
      }

      // Register for push notifications
      await this.registerListeners();
      await PushNotifications.register();

      this.initialized = true;
      this.setEnabled(true);
      console.log('Push notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  private async registerListeners(): Promise<void> {
    // Registration success
    await PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      this.token = token.value;
      localStorage.setItem(PUSH_TOKEN_KEY, token.value);
      
      // Dispatch event for external handling (e.g., send to backend)
      window.dispatchEvent(new CustomEvent('pushTokenReceived', { detail: { token: token.value } }));
    });

    // Registration error
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error.error);
      window.dispatchEvent(new CustomEvent('pushRegistrationError', { detail: { error: error.error } }));
    });

    // Notification received while app is in foreground
    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // User tapped on notification
    await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push notification action performed:', action);
      this.handleNotificationAction(action);
    });
  }

  private handleNotificationReceived(notification: PushNotificationSchema): void {
    // Store in history
    const history = JSON.parse(localStorage.getItem('pushNotificationHistory') || '[]');
    history.unshift({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      timestamp: new Date().toISOString(),
      read: false,
    });
    localStorage.setItem('pushNotificationHistory', JSON.stringify(history.slice(0, 100)));

    // Notify listeners
    this.listeners.forEach(listener => listener(notification));

    // Dispatch event
    window.dispatchEvent(new CustomEvent('pushNotificationReceived', { detail: notification }));

    // Show a local notification for foreground handling if needed
    // This ensures the user sees the notification even when app is open
  }

  private handleNotificationAction(action: ActionPerformed): void {
    const notification = action.notification;
    const data = notification.data as Record<string, any> | undefined;

    // Handle based on notification type
    if (data?.type === 'task_reminder' && data?.taskId) {
      window.dispatchEvent(new CustomEvent('taskNotificationTapped', { detail: { taskId: data.taskId } }));
    } else if (data?.type === 'note_reminder' && data?.noteId) {
      window.dispatchEvent(new CustomEvent('noteNotificationTapped', { detail: { noteId: data.noteId } }));
    }

    // Mark as read
    const history = JSON.parse(localStorage.getItem('pushNotificationHistory') || '[]');
    const updatedHistory = history.map((item: any) =>
      item.id === notification.id ? { ...item, read: true } : item
    );
    localStorage.setItem('pushNotificationHistory', JSON.stringify(updatedHistory));
  }

  // Get the current push token
  getToken(): string | null {
    if (this.token) return this.token;
    return localStorage.getItem(PUSH_TOKEN_KEY);
  }

  // Check if push notifications are enabled
  isEnabled(): boolean {
    return localStorage.getItem(PUSH_ENABLED_KEY) === 'true';
  }

  setEnabled(enabled: boolean): void {
    localStorage.setItem(PUSH_ENABLED_KEY, String(enabled));
  }

  // Subscribe to topics for categorized notifications
  getSubscribedTopics(): PushTopic[] {
    const topics = localStorage.getItem(PUSH_TOPICS_KEY);
    if (topics) {
      try {
        return JSON.parse(topics);
      } catch {
        return ['task_reminders', 'note_reminders'];
      }
    }
    return ['task_reminders', 'note_reminders'];
  }

  setSubscribedTopics(topics: PushTopic[]): void {
    localStorage.setItem(PUSH_TOPICS_KEY, JSON.stringify(topics));
    // In a full implementation, this would also update server-side subscriptions
  }

  // Add listener for notifications
  addNotificationListener(listener: (notification: PushNotificationSchema) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get delivered notifications
  async getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
    try {
      const result = await PushNotifications.getDeliveredNotifications();
      return result.notifications;
    } catch (error) {
      console.error('Error getting delivered notifications:', error);
      return [];
    }
  }

  // Remove specific delivered notifications
  async removeDeliveredNotifications(ids: string[]): Promise<void> {
    try {
      await PushNotifications.removeDeliveredNotifications({ notifications: ids.map(id => ({ id, tag: '', data: {} })) });
    } catch (error) {
      console.error('Error removing delivered notifications:', error);
    }
  }

  // Remove all delivered notifications
  async removeAllDeliveredNotifications(): Promise<void> {
    try {
      await PushNotifications.removeAllDeliveredNotifications();
    } catch (error) {
      console.error('Error removing all delivered notifications:', error);
    }
  }

  // Create a local representation of a task reminder for push notification payload
  createTaskReminderPayload(task: TodoItem): PushNotificationPayload {
    return {
      type: 'task_reminder',
      taskId: task.id,
      title: 'Task Reminder',
      body: task.text,
      data: {
        taskId: task.id,
        dueDate: task.dueDate?.toISOString(),
        priority: task.priority,
      },
    };
  }

  // Create a local representation of a note reminder for push notification payload
  createNoteReminderPayload(note: Note): PushNotificationPayload {
    return {
      type: 'note_reminder',
      noteId: note.id,
      title: 'Note Reminder',
      body: note.title || 'You have a note reminder',
      data: {
        noteId: note.id,
        reminderTime: note.reminderTime?.toString(),
      },
    };
  }

  // Get notification history
  getNotificationHistory(): any[] {
    try {
      return JSON.parse(localStorage.getItem('pushNotificationHistory') || '[]');
    } catch {
      return [];
    }
  }

  // Clear notification history
  clearNotificationHistory(): void {
    localStorage.setItem('pushNotificationHistory', '[]');
  }

  // Check if running on native platform
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }
}

export const pushNotificationService = PushNotificationService.getInstance();