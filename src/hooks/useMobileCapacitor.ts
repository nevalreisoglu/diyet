import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function useMobileCapacitor() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

  useEffect(() => {
    if (!isNative) return;

    // Dinamik olarak StatusBar yükle (opsiyonel plugin)
    async function initPlugins() {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Default });

        if (platform === 'android') {
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        }
      } catch {
        // StatusBar plugin yüklü değilse sessizce geç
      }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch {
        // SplashScreen plugin yüklü değilse sessizce geç
      }
    }

    initPlugins();
  }, [isNative, platform]);

  return { isNative, platform };
}
