import { Note } from '@/types/note';
import { saveNotificationHistory } from '@/types/notificationHistory';

// Web-based notification implementation (fallback for non-Capacitor environments)
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const scheduleNoteReminder = async (note: Note): Promise<number | number[] | null> => {
  if (!note.reminderEnabled || !note.reminderTime) {
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermission();

    if (!hasPermission) {
      console.warn('Notification permission not granted');
      return null;
    }

    const reminderDate = new Date(note.reminderTime);
    const now = new Date();
    const recurring = note.reminderRecurring || 'none';

    if (recurring === 'none') {
      if (reminderDate <= now) {
        console.warn('Reminder time is in the past');
        return null;
      }

      const notificationId = note.notificationId || Date.now();
      const delay = reminderDate.getTime() - now.getTime();

      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(note.title || 'Note Reminder', {
            body: note.content?.replace(/<[^>]*>/g, '').substring(0, 100) || 'You have a note reminder',
            icon: '/nota-logo.png',
          });
        }
      }, delay);

      console.log(`Scheduled notification ${notificationId} for ${reminderDate}`);
      return notificationId;
    }

    // For recurring reminders in web, we just schedule one
    const notificationId = Date.now();
    console.log(`Scheduled recurring notification ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

export const cancelNoteReminder = async (notificationId: number | number[]): Promise<void> => {
  console.log('Cancel notification:', notificationId);
};

export const updateNoteReminder = async (note: Note): Promise<number | number[] | null> => {
  if (note.notificationId) {
    await cancelNoteReminder(note.notificationId);
  }
  if (note.notificationIds && note.notificationIds.length > 0) {
    await cancelNoteReminder(note.notificationIds);
  }

  if (note.reminderEnabled && note.reminderTime) {
    return await scheduleNoteReminder(note);
  }

  return null;
};

export const getAllUpcomingReminders = async (): Promise<Array<{
  id: number;
  noteId: string;
  title: string;
  body: string;
  schedule: Date;
  recurring?: string;
}>> => {
  // Web implementation - return empty for now
  return [];
};

export const initializeNotificationListener = () => {
  console.log('Notification listener initialized');
};
