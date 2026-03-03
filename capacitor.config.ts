import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.beslenme.gunlugu',
  appName: 'Beslenme Günlüğü',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#ffffff',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f7faf4',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f7faf4',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#f7faf4',
  },
};

export default config;
