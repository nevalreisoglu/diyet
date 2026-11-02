import { Capacitor, registerPlugin } from '@capacitor/core';

export interface DailyReminder {
  id: number;
  title: string;
  body: string;
  hour: number;
  minute: number;
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

// Native tarafta @capacitor/local-notifications kuruluysa köprü üzerinden erişilir;
// JS paketi import edilmediği için web build'i eklentiye bağımlı değildir.
interface LocalNotificationsPlugin {
  checkPermissions(): Promise<{ display: string }>;
  requestPermissions(): Promise<{ display: string }>;
  schedule(options: { notifications: unknown[] }): Promise<unknown>;
  getPending(): Promise<{ notifications: { id: number }[] }>;
  cancel(options: { notifications: { id: number }[] }): Promise<void>;
}

const LocalNotifications = registerPlugin<LocalNotificationsPlugin>('LocalNotifications');

export const usesNativeNotifications = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');

const mapNative = (display: string): PermissionState =>
  display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';

const mapWeb = (): PermissionState => {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'prompt';
};

export async function getNotificationPermission(): Promise<PermissionState> {
  try {
    if (usesNativeNotifications()) {
      return mapNative((await LocalNotifications.checkPermissions()).display);
    }
    return mapWeb();
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  try {
    if (usesNativeNotifications()) {
      return mapNative((await LocalNotifications.requestPermissions()).display);
    }
    if (typeof Notification === 'undefined') return 'unsupported';
    const result = await Notification.requestPermission();
    return result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'unsupported';
  }
}

export async function cancelNativeReminders(): Promise<void> {
  if (!usesNativeNotifications()) return;
  try {
    const { notifications } = await LocalNotifications.getPending();
    if (notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
    }
  } catch (error) {
    console.error('Cancel reminders failed:', error);
  }
}

export async function scheduleNativeReminders(reminders: DailyReminder[]): Promise<void> {
  if (!usesNativeNotifications()) return;
  await cancelNativeReminders();
  if (reminders.length === 0) return;
  try {
    await LocalNotifications.schedule({
      notifications: reminders.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        schedule: { on: { hour: r.hour, minute: r.minute }, allowWhileIdle: true },
      })),
    });
  } catch (error) {
    console.error('Schedule reminders failed:', error);
  }
}

export function showWebNotification(title: string, body: string): boolean {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    new Notification(title, { body, icon: '/favicon.ico' });
    return true;
  } catch {
    return false;
  }
}
