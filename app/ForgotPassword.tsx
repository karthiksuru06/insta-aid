import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebaseConfig'; // Correct import for Firebase auth instance

const ForgotPassword: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>('');

  const handleReset = (): void => {
    if (!email) {
      Alert.alert(t('error'), t('enterMobileOrEmail'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      Alert.alert(t('error'), t('invalidEmail'));
      return;
    }

    // Reset password by sending email link
    sendPasswordResetEmail(auth, email)
      .then(() => {
        Alert.alert(t('success'), t('resetLinkSent', { email }));
        router.push('/Login');
      })
      .catch((error) => {
        Alert.alert(t('error'), error.message);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('forgotPasswordTitle')}</Text>



      <TextInput
        style={styles.input}
        placeholder={t('emailAddressPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity style={styles.button} onPress={handleReset}>
        <Text style={styles.buttonText}>{t('sendOtpResetLink')}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/Login')}>
        <Text style={styles.loginText}>{t('backToLogin')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: {
    backgroundColor: '#fafafa',
    padding: 14,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#ff4040',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginText: { textAlign: 'center', color: '#ff4040', textDecorationLine: 'underline', fontSize: 14 },
});

export default ForgotPassword;
