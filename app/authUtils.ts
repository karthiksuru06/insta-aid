import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to enable React Native AsyncStorage persistence dynamically.
// This uses a runtime import to avoid Metro resolving the module at bundle time.
export async function enableAuthPersistence(app: any) {
  try {
    // Dynamically import to avoid Metro static resolution problems
    // @ts-ignore - dynamic import of the react-native helper; may not exist in all environments
    const module = await import('firebase/auth/react-native');
    const { initializeAuth, getReactNativePersistence } = module as any;
    initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    return true;
  } catch (e) {
    // If this fails, it's safe to continue without persistent auth
    console.warn('Could not enable native auth persistence:', e);
    return false;
  }
}

// Mock function to dynamically get the current user's email
let currentUserEmail = ""; // Default to no user logged in

export function setCurrentUserEmail(email: string): void {
  currentUserEmail = email; // Update the current user's email
}

export function getCurrentUserEmail(): string {
  return currentUserEmail; // Return the current user's email
}
