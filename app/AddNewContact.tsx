import { Ionicons } from "@expo/vector-icons";
import { arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
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

export default function AddNewContact({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");



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