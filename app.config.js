import 'dotenv/config';

// The Sentry native config plugin uploads source maps during the native build
// and needs SENTRY_ORG / SENTRY_PROJECT (and SENTRY_AUTH_TOKEN). When those
// aren't set we omit it entirely so the EAS/Gradle build can't fail on it.
// Runtime JS error reporting (services/sentry.ts) still works with just a DSN.
const sentryPlugin =
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
    ? [[
        "@sentry/react-native/expo",
        { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT },
      ]]
    : [];

export default {
  expo: {
    name: "Instaaid",
    slug: "Instaaid",
    version: "1.0.4",
    runtimeVersion: {
      policy: "appVersion"
    },
    updates: {
      url: "https://u.expo.dev/9237c496-ac25-4259-95f1-a46aab754636",
      fallbackToCacheTimeout: 0,
      checkAutomatically: "ON_LOAD"
    },
    platforms: [
      "android",
      "ios",
      "web"
    ],
    orientation: "portrait",
    icon: "./assets/images/image.png",
    scheme: "instaaid",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "We need your location to send alerts and update last known location.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "We need your location in the background to monitor emergencies and battery alerts.",
        UIBackgroundModes: [
          "location",
          "fetch",
          "remote-notification"
        ],
        NSSpeechRecognitionUsageDescription: "Allow $(PRODUCT_NAME) to use speech recognition.",
        NSMicrophoneUsageDescription: "Allow $(PRODUCT_NAME) to use the microphone."
      }
    },
    android: {
      package: "com.instaaid.app",
      versionCode: 5,
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/images/image.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      allowBackup: true,
      softwareKeyboardLayoutMode: "pan",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.SEND_SMS",
        "android.permission.READ_CONTACTS",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.WAKE_LOCK",
        "android.permission.USE_FULL_SCREEN_INTENT",
        "android.permission.SYSTEM_ALERT_WINDOW"
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/image.png",
          imageWidth: 300,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/image.png",
          color: "#ED4B4B",
          sounds: [
            "./assets/sounds/alert.mp3"
          ]
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow Instaaid to access your location.",
          locationAlwaysPermission: "Allow Instaaid to access your location at all times.",
          locationWhenInUsePermission: "Allow Instaaid to access your location while using the app."
        }
      ],
      [
        "expo-background-fetch",
        {
          backgroundColor: "#ED4B4B"
        }
      ],
      [
        "expo-sensors",
        {
          motionEventInterval: 100
        }
      ],
      "expo-dev-client",
      "@react-native-google-signin/google-signin",
      "expo-font",
      "expo-web-browser",
      ...sentryPlugin
    ],
    extra: {
      router: {},
      eas: {
        projectId: "9237c496-ac25-4259-95f1-a46aab754636"
      }
    }
  }
};
