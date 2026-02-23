import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../components/ThemeContext";
import { auth } from "../../utils/firebaseConfig";

export default function ChangePassword() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [current, setCurrent] = useState<string>("");
  const [newPass, setNewPass] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  const isDark = theme === "dark";
  const PRIMARY_COLOR = "#FF5C62";
  const BG_COLOR = isDark ? "#111" : "#FFF";
  const TEXT_COLOR = isDark ? "#fff" : "#000";
  const INPUT_BG = isDark ? "#333" : "#fff";
  const INPUT_BORDER = isDark ? "#555" : "#FF5C62";
  const PLACEHOLDER_COLOR = isDark ? "#ccc" : "#888";

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email || t('noEmailFound'));
      const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
      setIsGoogleUser(isGoogle);
    }
  }, []);

  const handleSave = async () => {
    if (!current || !newPass || !confirm) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }

    if (newPass.length < 6) {
      Alert.alert(t('weakPasswordTitle'), t('weakPasswordMessage'));
      return;
    }

    if (newPass !== confirm) {
      Alert.alert(t('error'), t('passwordMismatch'));
      return;
    }

    try {
      if (!auth.currentUser || !auth.currentUser.email) {
        Alert.alert(t('error'), t('noUserLoggedIn'));
        return;
      }

      const credential = EmailAuthProvider.credential(auth.currentUser.email, current);
      await reauthenticateWithCredential(auth.currentUser, credential);

      await updatePassword(auth.currentUser, newPass);

      Alert.alert(t('success'), t('passwordUpdatedSuccess'), [
        { text: t('ok'), onPress: () => router.back() }
      ]);

      setCurrent("");
      setNewPass("");
      setConfirm("");

    } catch (error: any) {
      console.log("Change Password Error:", error);
      let msg = error.message || t('failedToChangePassword');

      // Map common error codes
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = t('incorrectCurrentPassword');
      } else if (error.code === 'auth/weak-password') {
        msg = t('weakNewPassword');
      } else if (error.code === 'auth/requires-recent-login') {
        msg = t('requiresRecentLogin');
      }

      Alert.alert(t('error'), msg);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safe, { backgroundColor: BG_COLOR }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={BG_COLOR} />

        <View style={[styles.headerBg, { backgroundColor: BG_COLOR, borderBottomColor: isDark ? "#333" : "#eee" }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="chevron-left" size={24} color={TEXT_COLOR} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: TEXT_COLOR }]}>{t('changePassword')}</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.formContainer}>

          {/* Show User Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: TEXT_COLOR }]}>{t('accountEmail')}</Text>
            <View style={[styles.disabledInputWrapper, { backgroundColor: isDark ? "#222" : "#f0f0f0", borderColor: isDark ? "#444" : "#e0e0e0" }]}>
              <Text style={[styles.inputPassword, { color: isDark ? "#aaa" : "#555", paddingVertical: 14 }]}>
                {userEmail}
              </Text>
            </View>
            {isGoogleUser &&
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                <Feather name="info" size={14} color={PRIMARY_COLOR} style={{ marginRight: 5 }} />
                <Text style={{ fontSize: 12, color: PRIMARY_COLOR }}>{t('signedInWithGoogle')}</Text>
              </View>
            }
          </View>

          {isGoogleUser ? (
            <View style={[styles.infoBox, { backgroundColor: isDark ? "#331111" : "#FFF0F0", borderColor: PRIMARY_COLOR }]}>
              <Feather name="alert-circle" size={24} color={PRIMARY_COLOR} style={{ marginBottom: 10 }} />
              <Text style={[styles.infoText, { color: TEXT_COLOR }]}>
                {t('googleSignInMessage')}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: TEXT_COLOR }]}>{t('currentPassword')}</Text>
                <View style={[styles.passwordWrapper, { backgroundColor: INPUT_BG, borderColor: INPUT_BORDER }]}>
                  <TextInput
                    style={[styles.inputPassword, { color: TEXT_COLOR }]}
                    placeholder={t('enterCurrentPassword')}
                    secureTextEntry={!showCurrent}
                    value={current}
                    onChangeText={setCurrent}
                    placeholderTextColor={PLACEHOLDER_COLOR}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowCurrent(!showCurrent)}
                  >
                    <Feather name={showCurrent ? "eye" : "eye-off"} size={20} color={PLACEHOLDER_COLOR} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: TEXT_COLOR }]}>{t('newPassword')}</Text>
                <View style={[styles.passwordWrapper, { backgroundColor: INPUT_BG, borderColor: INPUT_BORDER }]}>
                  <TextInput
                    style={[styles.inputPassword, { color: TEXT_COLOR }]}
                    placeholder={t('enterNewPassword')}
                    secureTextEntry={!showNew}
                    value={newPass}
                    onChangeText={setNewPass}
                    placeholderTextColor={PLACEHOLDER_COLOR}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowNew(!showNew)}
                  >
                    <Feather name={showNew ? "eye" : "eye-off"} size={20} color={PLACEHOLDER_COLOR} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: TEXT_COLOR }]}>{t('confirmNewPassword')}</Text>
                <View style={[styles.passwordWrapper, { backgroundColor: INPUT_BG, borderColor: INPUT_BORDER }]}>
                  <TextInput
                    style={[styles.inputPassword, { color: TEXT_COLOR }]}
                    placeholder={t('reEnterNewPassword')}
                    secureTextEntry={!showConfirm}
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholderTextColor={PLACEHOLDER_COLOR}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirm(!showConfirm)}
                  >
                    <Feather name={showConfirm ? "eye" : "eye-off"} size={20} color={PLACEHOLDER_COLOR} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[styles.buttonFilled, { backgroundColor: PRIMARY_COLOR }]} onPress={handleSave}>
                <Text style={styles.buttonFilledText}>{t('updatePassword')}</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBg: {
    paddingBottom: 16,
    paddingTop: 10,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  headerTitle: { fontSize: 18, fontWeight: "600" },

  formContainer: { padding: 22 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 15, fontWeight: "500", marginBottom: 8 },

  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  disabledInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  inputPassword: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 6,
  },

  buttonFilled: {
    borderRadius: 22,
    padding: 14,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonFilledText: { color: "#FFF", fontSize: 16, fontWeight: "600" },

  infoBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20
  },
  infoText: {
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 15
  }
});