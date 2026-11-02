import { useEffect, useState } from 'react';

export interface ReminderPrefs {
  mealsEnabled: boolean;
  waterEnabled: boolean;
  waterIntervalMin: number;
  waterStart: string;
  waterEnd: string;
}

const STORAGE_KEY = 'diyet_reminder_prefs';
const CHANGE_EVENT = 'diyet-reminder-prefs-changed';

export const defaultReminderPrefs: ReminderPrefs = {
  mealsEnabled: false,
  waterEnabled: false,
  waterIntervalMin: 90,
  waterStart: '09:00',
  waterEnd: '22:00',
};

export const getReminderPrefs = (): ReminderPrefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultReminderPrefs, ...JSON.parse(raw) } : defaultReminderPrefs;
  } catch {
    return defaultReminderPrefs;
  }
};

export const setReminderPrefs = (prefs: ReminderPrefs) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage kullanılamıyorsa tercih yalnızca bu oturumda geçerli kalır
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const useReminderPrefs = () => {
  const [prefs, setPrefsState] = useState<ReminderPrefs>(getReminderPrefs);

  useEffect(() => {
    const sync = () => setPrefsState(getReminderPrefs());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const update = (patch: Partial<ReminderPrefs>) => setReminderPrefs({ ...getReminderPrefs(), ...patch });

  return { prefs, update };
};
