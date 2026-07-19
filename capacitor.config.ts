import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexusai.app',
  appName: 'NexusAI',
  webDir: 'dist',
  server: {
    // Sin URL externa — carga los assets del dist/ empaquetado
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    buildOptions: {
      releaseType: 'APK',
    },
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-4903263409458961~5751005760',
      isTesting: false,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#080b14',
      showSpinner: false,
    },
  },
};

export default config;
