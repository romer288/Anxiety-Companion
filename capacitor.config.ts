// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Helper flags
 *  – CAPACITOR_DEV=true     ➜ we’re live-reloading on a device/emulator
 *  – CAPACITOR_DEV_URL=…    ➜ full origin where the Express API is running
 *
 * Example for LAN testing:
 *   CAPACITOR_DEV=true \
 *   CAPACITOR_DEV_URL=http://192.168.1.12:5000 \
 *   npx cap run android
 */
const isDev = process.env.CAPACITOR_DEV === 'true';
const DEV_URL = process.env.CAPACITOR_DEV_URL ?? '';

const config: CapacitorConfig = {
  appId: 'com.anxietycompanion.app',
  appName: 'Anxiety Companion',
  webDir: 'dist',

  // ──────────────────── Dev-only live-reload server ────────────────────
  ...(isDev && DEV_URL
    ? {
        server: {
          /** Where the mobile WebView should fetch during live reload */
          url: DEV_URL,            // e.g. "http://192.168.1.12:5000"
          /** Allow HTTP just for dev */
          cleartext: true,
        },
      }
    : {}),                         // Production builds get no server block

  // ──────────────────── Plugins ────────────────────
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#5664d2',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    SpeechRecognition: {
      iosPermissions: ['microphone', 'speech'],
      // Android permissions are handled in AndroidManifest.xml
    },
  },

  // ──────────────────── Platform tweaks ────────────────────
  android: {
    /** Mixed-content only allowed in dev; keep disabled for prod */
    allowMixedContent: isDev,
    /** Force HTTPS scheme resolution */
    scheme: 'https',
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
    /** Force HTTPS scheme resolution */
    scheme: 'https',
  },
};

export default config;
