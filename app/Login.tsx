import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../components/ThemeContext';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subheader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#000',
  },
  button: {
    backgroundColor: '#db3f2f',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  googleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  forgotText: {
    color: '#db3f2f',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
  footer: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  signupText: {
    color: '#db3f2f',
    fontWeight: 'bold',
  },
});

const Login: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 🔐 CHECK ADMIN & REDIRECT
  const redirectBasedOnRole = async (userEmail: string) => {
    try {
      // Mark onboarding as seen (in case user signed in directly)
      try { await AsyncStorage.setItem('hasSeenOnboarding', 'true'); } catch (e) { /* ignore */ }

      // Check setup completion state
      const firstLoginFlag = await AsyncStorage.getItem(`first_login_${userEmail}`);
      const permissionsCompleted = await AsyncStorage.getItem(`permissions_completed_${userEmail}`);
      const safetyCompleted = await AsyncStorage.getItem(`safety_completed_${userEmail}`);

      // Check if the user is in the admins collection
      const adminRef = doc(db, 'admins', userEmail);
      const adminSnap = await getDoc(adminRef);

      if (adminSnap.exists() || userEmail === 'instaaid08@gmail.com') {
        // ✅ ADMIN
        router.replace('../(tabs)/Admindashboard');
      } else if (firstLoginFlag && safetyCompleted) {
        // ✅ Full setup completed - go directly to Home
        router.replace('/(tabs)/Homepage');
      } else if (permissionsCompleted && !safetyCompleted) {
        // ✅ Permissions done, safety setup incomplete - resume at SafetyFeatures
        router.replace('/features/SafetyFeatures');
      } else {
        // ✅ First login - start at Enable Permissions
        router.replace('/features/EnablePermissions');
      }
    } catch (error) {
      console.log('Role check error:', error);
      // Fallback to homepage if an error occurs
      router.replace('/(tabs)/Homepage');
    }
  };

  // 🔑 EMAIL / PASSWORD LOGIN
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('error'), t('enterEmailPassword'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t('error'), t('emailInvalid'));
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update user status to Active after successful login
      const uid = userCredential.user.uid;
      console.log(`🔄 [LOGIN] Setting status to Active for user: ${uid} (${userCredential.user.email})`);

      const firebaseServices = await import('../services/firebaseServices');
      try {
        await firebaseServices.updateUserStatus(uid, 'Active');
        console.log(`✅ [LOGIN] Status update completed for ${uid}`);

        // Add a small delay to ensure Firestore replication
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify the update was successful by reading back
        const userData = await firebaseServices.getUserData(uid);
        console.log(`📋 [LOGIN VERIFY] User ${uid} status is now: ${userData?.status}`);

        if (userData?.status !== 'Active') {
          console.warn(`⚠️ [LOGIN] Status update may not have worked. Expected: Active, Got: ${userData?.status}`);
        }

        // ✅ User verified - proceed with login
        Alert.alert(t('success'), t('loggedInAs', { email: userCredential.user.email }));
        await redirectBasedOnRole(userCredential.user.email!);
      } catch (updateErr: any) {
        // ❌ User was likely deleted by an admin
        const errorMsg = String(updateErr.message || updateErr);
        if (errorMsg.includes('not found') || errorMsg.includes('deleted')) {
          console.warn(`⚠️ [LOGIN] User account not found (deleted by admin)`);
          Alert.alert(
            t('accountDeletedTitle'),
            t('accountDeletedMessage')
          );
          return; // Don't proceed with login
        }

        // Other errors
        console.error(`❌ [LOGIN] Status update failed:`, updateErr.message);
        Alert.alert(t('loginError'), updateErr.message || 'Failed to verify account status. Please try again.');
        return;
      }
    } catch (error: any) {
      Alert.alert(t('loginFailed'), error.message);
    }
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  // 🔵 GOOGLE LOGIN (lazy-loaded to avoid crash in Expo Go)
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { configureGoogleSignIn, signInWithGoogle } = await import('../services/googleAuthHelper');
      await configureGoogleSignIn();
      const result = await signInWithGoogle();

      const uid = result.user.uid;
      console.log(`[GOOGLE] Signed in user: ${uid} (${result.user.email})`);

      const firebaseServices = await import('../services/firebaseServices');
      try {
        // Use saveUserData with merge to safely create/update user doc
        await firebaseServices.saveUserData(uid, {
          email: result.user.email,
          displayName: result.user.displayName || '',
          status: 'Active',
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        Alert.alert(t('success'), t('loggedInAs', { email: result.user.email }));
        await redirectBasedOnRole(result.user.email!);
      } catch (updateErr: any) {
        const errorMsg = String(updateErr.message || updateErr);
        if (errorMsg.includes('not found') || errorMsg.includes('deleted')) {
          Alert.alert(
            t('accountDeletedTitle'),
            t('accountDeletedMessage')
          );
          return;
        }

        console.error('[GOOGLE] Status update failed:', updateErr.message);
        Alert.alert(t('loginError'), updateErr.message || 'Failed to verify account status.');
      }
    } catch (err: any) {
      // User cancelled - no alert needed
      if (err.code === '12501' || err.code === 'SIGN_IN_CANCELLED') {
        return;
      }
      console.error('[GOOGLE LOGIN] Error:', err);
      Alert.alert(t('googleSignInFailed'), err.message || 'An error occurred during sign-in');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme === "dark" ? "#111" : "#fff" }]}>
      <Text style={[styles.header, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('welcomeBack')}</Text>
      <Text style={[styles.subheader, { color: theme === "dark" ? "#ccc" : "#666" }]}>{t('signInSubtitle')}</Text>

      {/* Email */}
      <Text style={[styles.label, { color: theme === "dark" ? "#ccc" : "#333" }]}>{t('emailLabel')}</Text>
      <View style={[styles.inputRow, { backgroundColor: theme === "dark" ? "#222" : "#f9f9f9", borderColor: theme === "dark" ? "#555" : "#ddd" }]}>
        <FontAwesome name="envelope-o" size={18} color={theme === "dark" ? "#ccc" : "#888"} />
        <TextInput
          style={[styles.input, { color: theme === "dark" ? "#fff" : "#000" }]}
          placeholder={t('emailPlaceholder')}
          placeholderTextColor={theme === "dark" ? "#777" : "#888"}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </View>

      {/* Password */}
      <Text style={[styles.label, { color: theme === "dark" ? "#ccc" : "#333" }]}>{t('passwordLabel')}</Text>
      <View style={[styles.inputRow, { backgroundColor: theme === "dark" ? "#222" : "#f9f9f9", borderColor: theme === "dark" ? "#555" : "#ddd" }]}>
        <FontAwesome name="lock" size={18} color={theme === "dark" ? "#ccc" : "#888"} />
        <TextInput
          style={[styles.input, { color: theme === "dark" ? "#fff" : "#000" }]}
          placeholder={t('passwordPlaceholder')}
          placeholderTextColor={theme === "dark" ? "#777" : "#888"}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <FontAwesome
            name={showPassword ? 'eye' : 'eye-slash'}
            size={20}
            color="#db3f2f"
          />
        </TouchableOpacity>
      </View>

      {/* Login */}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>{t('logInButton')}</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme === "dark" ? "#555" : "#ddd" }} />
        <Text style={{ marginHorizontal: 10, fontWeight: '700', color: theme === "dark" ? "#ccc" : "#000" }}>{t('or')}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme === "dark" ? "#555" : "#ddd" }} />
      </View>

      {/* Google */}
      <TouchableOpacity
        style={[styles.googleButton, { opacity: googleLoading ? 0.6 : 1, backgroundColor: theme === "dark" ? "#222" : "#fff", borderColor: theme === "dark" ? "#555" : "#ddd" }]}
        onPress={handleGoogleLogin}
        disabled={googleLoading}
      >
        <FontAwesome name="google" size={16} color={theme === "dark" ? "#ccc" : "#333"} />
        <Text style={[styles.googleText, { color: theme === "dark" ? "#ccc" : "#333" }]}> {googleLoading ? t('signingIn') : t('signInWithGoogle')}</Text>
      </TouchableOpacity>

      {/* Links */}
      <TouchableOpacity onPress={() => router.push('/ForgotPassword')}>
        <Text style={styles.forgotText}>{t('forgotPasswordLink')}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/Signup')}>
        <Text style={[styles.footer, { color: theme === "dark" ? "#ccc" : "#666" }]}>
          {t('dontHaveAccount')} <Text style={styles.signupText}>{t('signUpLink')}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Login;