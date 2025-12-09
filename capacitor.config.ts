import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nota.com',
  appName: 'Npd',
  webDir: 'dist',
  // Comment out server block for production build (local assets)
  // Uncomment for live reload during development
  // server: {
  //   url: 'https://70d65a03-2074-4d6a-9764-003436c73c92.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#4F46E5',
      sound: 'notification.wav'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
