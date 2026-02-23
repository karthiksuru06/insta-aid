// screens/Logout.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

type LogoutProps = {
  onClose: () => void;
  onConfirm: () => void;
};

// ✅ Define image once
const logoutImg = require("../assets/logout.jpg");

export default function Logout({ onClose, onConfirm }: LogoutProps) {
  return (
    <View style={styles.modalBox}>
      {/* Title */}
      <Text style={styles.title}>Logout</Text>

      {/* Illustration */}
      <Image source={logoutImg} style={styles.image} />

      {/* Message */}
      <Text style={styles.message}>Are you sure you want to log out?</Text>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={onConfirm}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBox: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    width: "80%",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF5C62",
    marginBottom: 12,
  },
  image: {
    width: "100%",
    height: 180,
    resizeMode: "contain",
    marginBottom: 16,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    marginRight: 8,
    backgroundColor: "#E0E0E0", // Grey background for Cancel
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelText: {
    color: "#333", // Dark text for contrast
    fontSize: 15,
    fontWeight: "600",
  },
  logoutBtn: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: "#FF5C62", // Red for Logout
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
});