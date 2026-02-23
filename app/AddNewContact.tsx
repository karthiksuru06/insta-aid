import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import * as SMS from "expo-sms";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../components/ThemeContext";
import { auth, db } from "../firebaseConfig";
import { useTranslation } from 'react-i18next';

export default function AddNewContact({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // 🔄 Shake detection refs
  const lastShakeRef = useRef<number>(0);
  const shakeCountRef = useRef<number>(0);
  const subRef = useRef<any>(null);

  // 🧠 Shake Detection Effect
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const available = await Accelerometer.isAvailableAsync().catch(() => false);
        if (!available) {
          console.log("[ShakeService] accelerometer not available");
          return;
        }

        const THRESH = 1.6;
        const INTERVAL_MS = 100;
        const MIN_GAP_MS = 1000;

        Accelerometer.setUpdateInterval(INTERVAL_MS);
        subRef.current = Accelerometer.addListener(handleData);

        const reset = setInterval(() => {
          shakeCountRef.current = 0;
        }, 4000);

        // cleanup on unmount
        return () => {
          mounted = false;
          try {
            subRef.current && subRef.current.remove();
          } catch { }
          clearInterval(reset);
        };
      } catch (e) {
        console.warn("[ShakeService] init error", e);
      }
    })();

    async function handleData(data: any) {
      try {
        const { x, y, z } = data || {};
        const acc = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);
        const now = Date.now();
        if (acc > 1.6 && now - lastShakeRef.current > 1000) {
          lastShakeRef.current = now;
          shakeCountRef.current += 1;
          if (shakeCountRef.current >= 3) {
            shakeCountRef.current = 0;
            // If shake detection toggle is OFF (global), prompt to enable instead of sending
            try {
              const enabled = await AsyncStorage.getItem('shakeDetectionEnabled');
              if (enabled !== 'true') {
                Alert.alert(t('alerts.enableShakeDetection') || 'Enable Shake Alert Mode', t('alerts.shakeAlertModeRequired') || 'Please turn on the toggle to send your location.', [
                  { text: t('turnOn'), onPress: async () => { try { await AsyncStorage.setItem('shakeDetectionEnabled', 'true'); } catch { } } },
                  { text: t('cancel'), style: 'cancel' }
                ]);
                return;
              }
            } catch (e) { }

            await onShakeDetected().catch((err) =>
              console.warn("[ShakeService] onShakeDetected error", err)
            );
          }
        }
      } catch (e) {
        console.warn("[ShakeService] handleData error", e);
      }
    }

    async function onShakeDetected() {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log("[ShakeService] no authenticated user - ignoring shake");
          return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          console.log("[ShakeService] user doc missing");
          return;
        }

        const data = snap.data() as any;
        const contacts = (data.emergencyContacts ?? [])
          .slice(0, 3)
          .map((c: any) => c.phone)
          .filter(Boolean);

        if (contacts.length === 0) {
          console.log("[ShakeService] no contacts to notify");
          return;
        }

        let coordsLink = "location unavailable";
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Highest,
            });
            coordsLink = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
          } else {
            console.log("[ShakeService] location permission denied");
          }
        } catch (e) {
          console.warn("[ShakeService] location fetch failed", e);
        }

        const message = `🚨 I need help! My location: ${coordsLink}`;

        try {
          const functions = getFunctions();
          const sendEmergencySms = httpsCallable(functions, "sendEmergencySms");
          await sendEmergencySms({ phones: contacts, message });
          console.log("[ShakeService] callable function invoked");
          return;
        } catch (fnErr) {
          console.warn(
            "[ShakeService] callable function failed, falling back to SMS composer",
            fnErr
          );
        }

        try {
          const isAvailable = await SMS.isAvailableAsync();
          if (isAvailable) {
            await SMS.sendSMSAsync(contacts, message);
            console.log("[ShakeService] SMS composer opened");
          } else {
            console.warn("[ShakeService] SMS not available on device");
          }
        } catch (smsErr) {
          console.warn("[ShakeService] SMS fallback failed", smsErr);
        }
      } catch (err) {
        console.warn("[ShakeService] unexpected error", err);
      }
    }
  }, []);

  // 🧩 Add Contact Logic
  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert(t('addNewContactPage.validationTitle'), t('addNewContactPage.validationMessage'));
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      Alert.alert(t('addNewContactPage.invalidNumberTitle'), t('addNewContactPage.invalidNumberMessage'));
      return;
    }

    try {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          // ✅ Removed the "Limit Reached" alert logic
          await updateDoc(userDocRef, {
            emergencyContacts: arrayUnion({
              name: name.trim(),
              phone: phone.trim(),
            }),
          });

          Alert.alert(t('addNewContactPage.successTitle'), t('addNewContactPage.successMessage'));
          onClose();
        } else {
          Alert.alert(t('addNewContactPage.errorTitle'), t('addNewContactPage.userNotFound'));
        }
      }
    } catch (error) {
      console.error("Error adding contact:", error);
      Alert.alert(t('addNewContactPage.errorTitle'), t('addNewContactPage.addFailed'));
    }
  };

  // 🧱 UI
  return (
    <View key={i18n.language} style={styles.overlay}>
      <View style={[styles.modalContainer, { backgroundColor: theme === "dark" ? "#222" : "#fff" }]}>
        <Text style={[styles.headerText, { color: theme === "dark" ? "#fff" : "#FF6464" }]}>{t('addNewContactPage.title')}</Text>

        <View style={styles.inputGroup}>
          <Ionicons name="person-outline" size={20} color="#FF6464" style={{ marginRight: 6 }} />
          <Text style={[styles.label, { color: theme === "dark" ? "#ccc" : "#222" }]}>{t('addNewContactPage.nameLabel')}</Text>
        </View>
        <TextInput
          placeholder={t('addNewContactPage.namePlaceholder')}
          style={[styles.input, {
            backgroundColor: theme === "dark" ? "#333" : "#fff",
            borderColor: theme === "dark" ? "#555" : "#FF6464",
            color: theme === "dark" ? "#fff" : "#222"
          }]}
          placeholderTextColor={theme === "dark" ? "#ccc" : "#888"}
          value={name}
          onChangeText={setName}
        />

        <View style={styles.inputGroup}>
          <Ionicons name="call-outline" size={20} color="#FF6464" style={{ marginRight: 6 }} />
          <Text style={[styles.label, { color: theme === "dark" ? "#ccc" : "#222" }]}>{t('addNewContactPage.phoneLabel')}</Text>
        </View>
        <TextInput
          placeholder={t('addNewContactPage.phonePlaceholder')}
          style={[styles.input, {
            backgroundColor: theme === "dark" ? "#333" : "#fff",
            borderColor: theme === "dark" ? "#555" : "#FF6464",
            color: theme === "dark" ? "#fff" : "#222"
          }]}
          placeholderTextColor={theme === "dark" ? "#ccc" : "#888"}
          value={phone}
          keyboardType="phone-pad"
          onChangeText={setPhone}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Text style={styles.buttonText}>{t('addNewContactPage.addButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme === "dark" ? "#555" : "#999" }]} onPress={onClose}>
            <Text style={styles.buttonText}>{t('addNewContactPage.cancelButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF6464",
    textAlign: "center",
    marginBottom: 15,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  label: { fontWeight: "600", fontSize: 15, color: "#222" },
  input: {
    width: "100%",
    height: 40,
    borderRadius: 10,
    borderColor: "#FF6464",
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  addButton: {
    backgroundColor: "#FF6464",
    paddingVertical: 10,
    width: "48%",
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#999",
    paddingVertical: 10,
    width: "48%",
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});