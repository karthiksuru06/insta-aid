// firebaseConfig.ts
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import {
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCHQT1-12FZ17UO4U4ScoyLNT84dlyglzI",
  authDomain: "instaaid-43394.firebaseapp.com",
  projectId: "instaaid-43394",
  storageBucket: "instaaid-43394.firebasestorage.app",
  messagingSenderId: "181830039349",
  appId: "1:181830039349:android:164a711899b3dee7e6be7c",
};

// ✅ Initialize app safely
const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

import { Platform } from "react-native";

// ✅ FIXED AUTH FOR REACT NATIVE AND WEB
import { Auth } from "firebase/auth";
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

