import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Correct import for Firebase auth instance
import { useTranslation } from 'react-i18next';

const ForgotPassword: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [mobile, setMobile] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const handleReset = (): void => {
    if (!mobile && !email) {
      Alert.alert(t('error'), t('enterMobileOrEmail'));
      return;
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (mobile && !mobileRegex.test(mobile)) {
      Alert.alert(t('error'), t('invalidMobile'));
      return;
    }

    if (email && !emailRegex.test(email)) {
      Alert.alert(t('error'), t('invalidEmail'));
      return;
    }

    if (mobile) {
      // For OTP to mobile, navigate to OTP screen with the mobile parameter
      Alert.alert(t('success'), t('otpSent', { mobile }));
      router.push(`/Otp?mobile=${mobile}`);
    } else {
      // Reset password by sending email link
      sendPasswordResetEmail(auth, email)
        .then(() => {
          Alert.alert(t('success'), t('resetLinkSent', { email }));
          router.push('/Login'); // optional navigation after success
        })
        .catch((error) => {
          Alert.alert(t('error'), error.message);
        });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('forgotPasswordTitle')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('mobilePlaceholder')}
        keyboardType="number-pad"
        value={mobile}
        onChangeText={setMobile}
        maxLength={10}
      />

      <Text style={{ textAlign: 'center', marginVertical: 8, color: '#888' }}>{t('or')}</Text>

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
