// firebaseConfig.ts
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import {
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import { Platform } from "react-native";

// ✅ FIXED AUTH FOR REACT NATIVE AND WEB
import { Auth } from "firebase/auth";

// Firebase config is sourced exclusively from environment variables
// (EXPO_PUBLIC_* are inlined into the bundle at build time). No secrets are
// hard-coded here. Note: Firebase Web API keys are *not* secrets — they only
// identify the project; real protection comes from Firestore/Storage security
// rules and App Check. We still keep them in env so they can be rotated and so
// different environments (dev/staging/prod) can be swapped without code edits.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  // Fail loudly during development/build so misconfiguration is caught early
  // instead of silently falling back to a committed key.
  throw new Error(
    "Missing Firebase configuration. Set the EXPO_PUBLIC_FIREBASE_* environment variables (see .env.example)."
  );
}

// ✅ Initialize app safely
const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];
let auth: Auth;
if (Platform.OS === "web") {
  auth = initializeAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}
export { auth };

// Firestore (no change)
export const db = getFirestore(app);

export { firebaseConfig };

