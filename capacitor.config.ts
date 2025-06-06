import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anxietycompanion.app',
  appName: 'Anxiety Companion',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#5664d2",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    // Permissions for iOS
    "SpeechRecognition": {
      "iosPermissions": ["microphone", "speech"]
    },
    // Android permissions are managed in the AndroidManifest.xml
  },
  android: {
    // Android specific settings
    allowMixedContent: true,
  },
  ios: {
    // iOS specific settings
    contentInset: "always",
    allowsLinkPreview: false,
    scrollEnabled: true,
  }
};

export default config;
