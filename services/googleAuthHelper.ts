import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Web Client ID from Firebase Console (client_type: 3)
const WEB_CLIENT_ID =
  '181830039349-ma87eouo2epb9p7hp3ktv38o6dkt2sti.apps.googleusercontent.com';

// Lazy-load the native module to avoid crashing in Expo Go
async function getGoogleSignin() {
  const mod = await import('@react-native-google-signin/google-signin');
  return mod.GoogleSignin;
}

/**
 * Configure GoogleSignin. Call once at app startup.
 */
export async function configureGoogleSignIn() {
  try {
    const GoogleSignin = await getGoogleSignin();
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: false,
    });
  } catch (e) {
    console.warn('[GOOGLE] Native module not available (Expo Go?). Google Sign-In disabled.');
  }
}

/**
 * Perform native Google Sign-In and authenticate with Firebase.
 * Returns the Firebase UserCredential on success.
 */
export async function signInWithGoogle() {
  const GoogleSignin = await getGoogleSignin();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Force account picker every time (equivalent to prompt=select_account)
  try { await GoogleSignin.signOut(); } catch (_) { /* no previous session */ }

  const response = await GoogleSignin.signIn();

  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error('No ID token returned from Google Sign-In');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  return await signInWithCredential(auth, credential);
}

/**
 * Sign out from Google native session.
 * Call alongside Firebase signOut for a clean logout.
 */
export async function googleSignOut() {
  try {
    const GoogleSignin = await getGoogleSignin();
    await GoogleSignin.signOut();
  } catch (error) {
    // Non-critical: user may not have signed in via Google or native module unavailable
  }
}
