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

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCHQT1-12FZ17UO4U4ScoyLNT84dlyglzI",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "instaaid-43394.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "instaaid-43394",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "instaaid-43394.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "181830039349",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:181830039349:android:164a711899b3dee7e6be7c",
};

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

