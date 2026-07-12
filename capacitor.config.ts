import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexusai.app',
  appName: 'NexusAI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#080b14',
      showSpinner: false,
    },
    AdMob: {
      appId: 'ca-app-pub-4903263409458961~5751005760',
      initializeForTesting: false,
    },
  },
};

export default config;
