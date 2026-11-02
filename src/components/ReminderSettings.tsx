import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReminderPrefs } from '@/lib/reminderPrefs';
import { useMealSchedules } from '@/hooks/useMealSchedules';
import { useMobileCapacitor } from '@/hooks/useMobileCapacitor';
import {
  PermissionState,
  getNotificationPermission,
  requestNotificationPermission,
  usesNativeNotifications,
} from '@/lib/notifications';

interface ReminderSettingsProps {
  userId?: string;
}

const intervalOptions = [
  { value: 60, label: 'Her saat' },
  { value: 90, label: '1,5 saatte bir' },
  { value: 120, label: '2 saatte bir' },
  { value: 180, label: '3 saatte bir' },
];

export const ReminderSettings = ({ userId }: ReminderSettingsProps) => {
  const { prefs, update } = useReminderPrefs();
  const { schedules } = useMealSchedules(userId);
  const { isNative } = useMobileCapacitor();
  const [permission, setPermission] = useState<PermissionState>('prompt');

  useEffect(() => {
    getNotificationPermission().then(setPermission);
  }, []);

  const scheduledMealCount = Object.values(schedules).filter(Boolean).length;
  const anyEnabled = prefs.mealsEnabled || prefs.waterEnabled;
  const nativeReady = usesNativeNotifications();

  const askPermission = async () => {
    setPermission(await requestNotificationPermission());
  };

  const enable = async (patch: Parameters<typeof update>[0]) => {
    if (permission === 'prompt') await askPermission();
    update(patch);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Hatırlatıcılar
        </CardTitle>
        <CardDescription>
          Öğün saatlerinde ve su molalarında bildirim alın. Öğün saatleri ana sayfadaki öğün kartlarından ayarlanır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={prefs.mealsEnabled}
            onCheckedChange={(c) => enable({ mealsEnabled: c === true })}
            className="mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Öğün hatırlatıcıları</p>
            <p className="text-xs text-muted-foreground">
              {scheduledMealCount > 0
                ? `${scheduledMealCount} öğün için saat tanımlı; listendeki yiyecekler bildirimde görünür.`
                : 'Henüz hiçbir öğüne saat eklenmemiş; ana sayfadan "Saat ekle" ile tanımlayın.'}
            </p>
          </div>
        </label>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={prefs.waterEnabled}
              onCheckedChange={(c) => enable({ waterEnabled: c === true })}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-foreground">Su hatırlatıcısı</p>
              <p className="text-xs text-muted-foreground">Belirlediğiniz saatler arasında düzenli aralıklarla.</p>
            </div>
          </label>

          {prefs.waterEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-7">
              <div className="space-y-1">
                <Label className="text-xs">Aralık</Label>
                <Select value={String(prefs.waterIntervalMin)} onValueChange={(v) => update({ waterIntervalMin: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {intervalOptions.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Başlangıç</Label>
                <Input type="time" value={prefs.waterStart} onChange={(e) => update({ waterStart: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bitiş</Label>
                <Input type="time" value={prefs.waterEnd} onChange={(e) => update({ waterEnd: e.target.value })} />
              </div>
            </div>
          )}
        </div>

        {anyEnabled && (
          <div className="rounded-xl bg-secondary/50 p-3 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                {permission === 'granted' ? <BellRing className="h-3.5 w-3.5 text-green-600" /> : <BellOff className="h-3.5 w-3.5" />}
                Bildirim izni: {permission === 'granted' ? 'verildi' : permission === 'denied' ? 'reddedildi' : permission === 'unsupported' ? 'bu cihazda desteklenmiyor' : 'henüz istenmedi'}
              </span>
              {permission === 'prompt' && (
                <Button size="sm" variant="outline" onClick={askPermission}>İzin ver</Button>
              )}
            </div>
            {permission === 'denied' && (
              <p>İzin cihaz/tarayıcı ayarlarından yeniden verilmeli.</p>
            )}
            {!isNative && (
              <p>Tarayıcıda hatırlatıcılar yalnızca uygulama açıkken çalışır. Arka planda bildirim için telefon uygulamasını kullanın.</p>
            )}
            {isNative && !nativeReady && (
              <p className="flex items-start gap-1.5">
                <Smartphone className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Bu sürümde bildirim eklentisi kurulu değil; uygulama güncellendiğinde arka plan bildirimleri etkinleşir.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
