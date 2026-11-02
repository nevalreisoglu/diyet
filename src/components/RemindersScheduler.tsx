import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useMealSchedules } from '@/hooks/useMealSchedules';
import { useCustomFoods } from '@/hooks/useCustomFoods';
import { useReminderPrefs, ReminderPrefs } from '@/lib/reminderPrefs';
import { MealType, mealTypeLabels, mealTypeIcons } from '@/types/nutrition';
import type { CustomFood } from '@/hooks/useCustomFoods';
import {
  DailyReminder,
  usesNativeNotifications,
  scheduleNativeReminders,
  cancelNativeReminders,
  showWebNotification,
} from '@/lib/notifications';

const mealTypes: MealType[] = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner', 'snack3'];
const WATER_ID_BASE = 100;

const parseTime = (value: string): [number, number] | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60 ? [hour, minute] : null;
};

export const buildReminders = (
  prefs: ReminderPrefs,
  schedules: Record<MealType, string | null>,
  plannedFoods: CustomFood[],
): DailyReminder[] => {
  const reminders: DailyReminder[] = [];

  if (prefs.mealsEnabled) {
    mealTypes.forEach((mealType, index) => {
      const time = schedules[mealType];
      const parsed = time ? parseTime(time) : null;
      if (!parsed) return;
      const names = plannedFoods.filter((f) => f.meal_type === mealType).map((f) => f.name);
      const body = names.length > 0
        ? `Listende: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`
        : 'Öğününü kaydetmeyi unutma.';
      reminders.push({
        id: index + 1,
        title: `${mealTypeIcons[mealType]} ${mealTypeLabels[mealType]} zamanı`,
        body,
        hour: parsed[0],
        minute: parsed[1],
      });
    });
  }

  if (prefs.waterEnabled) {
    const start = parseTime(prefs.waterStart);
    const end = parseTime(prefs.waterEnd);
    const interval = Math.max(30, prefs.waterIntervalMin);
    if (start && end) {
      const startMin = start[0] * 60 + start[1];
      const endMin = end[0] * 60 + end[1];
      let slot = 0;
      for (let t = startMin; t <= endMin && slot < 24; t += interval, slot += 1) {
        reminders.push({
          id: WATER_ID_BASE + slot,
          title: '💧 Su molası',
          body: 'Bir bardak su iç ve kaydet.',
          hour: Math.floor(t / 60),
          minute: t % 60,
        });
      }
    }
  }

  return reminders;
};

const msUntilNext = (reminders: DailyReminder[]): { delay: number; reminder: DailyReminder } | null => {
  if (reminders.length === 0) return null;
  const now = new Date();
  let best: { delay: number; reminder: DailyReminder } | null = null;
  for (const r of reminders) {
    const next = new Date(now);
    next.setHours(r.hour, r.minute, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    if (!best || delay < best.delay) best = { delay, reminder: r };
  }
  return best;
};

interface Props {
  userId: string;
}

// Uygulama kökünde bir kez çalışır: tercih veya öğün saati değişince bildirimleri yeniden planlar.
export const RemindersScheduler = ({ userId }: Props) => {
  const { prefs } = useReminderPrefs();
  const { schedules } = useMealSchedules(userId);
  const { customFoods } = useCustomFoods(userId);

  const reminders = useMemo(() => buildReminders(prefs, schedules, customFoods), [prefs, schedules, customFoods]);
  const signature = JSON.stringify(reminders);

  useEffect(() => {
    if (usesNativeNotifications()) {
      if (reminders.length === 0) cancelNativeReminders();
      else scheduleNativeReminders(reminders);
      return;
    }

    // Web: yalnızca uygulama açıkken, bir sonraki hatırlatıcıya zamanlayıcı kur
    let timer: number | undefined;
    const arm = () => {
      const next = msUntilNext(reminders);
      if (!next) return;
      timer = window.setTimeout(() => {
        const shown = showWebNotification(next.reminder.title, next.reminder.body);
        if (!shown) toast(next.reminder.title, { description: next.reminder.body, duration: 8000 });
        arm();
      }, Math.min(next.delay, 24 * 60 * 60 * 1000) + 1000);
    };
    arm();
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return null;
};
