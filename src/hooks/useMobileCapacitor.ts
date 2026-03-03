import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function useMobileCapacitor() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

  useEffect(() => {
    if (!isNative) return;

    // Android'de status bar rengini ayarla (opsiyonel plugin ile)
    async function initPlugins() {
      try {
        // @ts-ignore - opsiyonel plugin, yüklü değilse hata vermez
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Default });
        if (platform === 'android') {
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        }
      } catch {
        // Plugin yüklü değilse sessizce geç
      }

      try {
        // @ts-ignore
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch {
        // Plugin yüklü değilse sessizce geç
      }
    }

    initPlugins();
  }, [isNative, platform]);

  return { isNative, platform };
}
