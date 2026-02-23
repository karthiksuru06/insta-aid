import AsyncStorage from '@react-native-async-storage/async-storage';

export async function enableAuthPersistence(app: any) {
  try {
    const module = await import('firebase/auth/react-native');
    const { initializeAuth, getReactNativePersistence } = module as any;
    initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    return true;
  } catch (e) {
    console.warn('Could not enable native auth persistence:', e);
    return false;
  }
}

let currentUserEmail = "";

export function setCurrentUserEmail(email: string): void {
  currentUserEmail = email;
}

export function getCurrentUserEmail(): string {
  return currentUserEmail;
}
