import { Capacitor } from '@capacitor/core';

export function useMobileCapacitor() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

  return { isNative, platform };
}
