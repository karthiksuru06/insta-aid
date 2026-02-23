import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons'; // For eye icon
import { useRouter } from 'expo-router';

const ResetPasswordScreen: React.FC = () => {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUpdatePassword = () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both password fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    // Proceed with your update password logic here (API call, etc.)
    Alert.alert('Success', 'Password updated successfully.');
    // Navigate to Login or next screen if needed
    router.push('/Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Arrow */}
      <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
        <Icon name="arrow-back-ios" size={24} color="#000" />
      </TouchableOpacity>

      {/* Logo & Title */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Icon name="phone-android" size={36} color="#fff" />
        </View>
        <Text style={styles.brandName}>Instaaid</Text>
        <Text style={styles.tagline}>Shake. Alert. Stay Safe.</Text>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>
          Create a new password. Ensure it differs from previous ones for security
        </Text>

        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter new password"
            placeholderTextColor="#ccc"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Icon name={showPassword ? "visibility" : "visibility-off"} size={22} color="#666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor="#ccc"
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Icon name={showConfirmPassword ? "visibility" : "visibility-off"} size={22} color="#666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleUpdatePassword}>
          <Text style={styles.buttonText}>Update Password</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  backArrow: {
    marginTop: 10,
    marginBottom: 10,
    width: 30,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ff5656",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  tagline: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 30,
  },
  formContainer: {
    marginTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#222",
  },
  subtitle: {
    fontSize: 13,
    color: "#999",
    marginBottom: 20,
  },
  inputLabel: {
    fontWeight: "bold",
    marginBottom: 6,
    marginTop: 15,
    color: "#222",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4e4e4",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 0,
    backgroundColor: "#fafafa",
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#222",
  },
  button: {
    marginTop: 28,
    backgroundColor: "#ff5656",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
  },
});

export default ResetPasswordScreen;

