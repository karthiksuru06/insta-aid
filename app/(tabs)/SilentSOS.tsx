import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  ToastAndroid,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as SMS from "expo-sms";

import { auth, db } from "../../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { saveAlert } from "../../services/firebaseServices";

type Contact = {
  name?: string;
  phone?: string;
  relation?: string;
};

export default function SilentSOS() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Load user email
  useEffect(() => {
    const user = auth.currentUser;
    if (user?.email) setUserEmail(user.email);
  }, []);

  // Load emergency contacts
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { emergencyContacts?: Contact[] };
        setContacts(data.emergencyContacts ?? []);
      }
    });

    return () => unsubscribe();
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required for emergency alerts.");
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      return { latitude, longitude };
    } catch (error) {
      console.error("Error getting location:", error);
      return null;
    }
  };

  // Send emergency SMS
  const sendEmergencySMS = async (latitude: number, longitude: number) => {
    if (contacts.length === 0) return;

    const contactPhones = contacts
      .map((c) => c.phone)
      .filter((phone): phone is string => Boolean(phone && phone.length > 0));

    if (contactPhones.length === 0) return;

    const smsEnabled = await AsyncStorage.getItem("smsEnabled");
    if (smsEnabled !== "true") {
      console.warn("SMS permission not enabled");
      return;
    }

    const coordsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const message = `EMERGENCY ALERT! I need help! My location: ${coordsLink}`;

    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync(contactPhones, message);
      if (Platform.OS === "android") {
        ToastAndroid.show("Emergency SMS Sent!", ToastAndroid.SHORT);
      } else {
        Alert.alert("Emergency SMS Sent!");
      }
    }
  };

  // Trigger False Alarm
  const triggerFalseAlarm = async () => {
    Alert.alert(
      "Trigger False Alarm",
      "This will send a motion sensor false alarm alert. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              const location = await getCurrentLocation();
              if (!location) return;

              const { latitude, longitude } = location;

              // Save alert to Firebase
              await saveAlert({
                title: "Motion Sensor False Alarm",
                description: "User triggered a false alarm from motion sensor detection",
                location: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
                user: userEmail,
                type: "motion_sensor_false_alarm",
                severity: "Low",
                status: "New",
                latitude,
                longitude,
                nearbyUsers: contacts.map(c => c.phone).filter(Boolean) as string[],
              });

              // Send SMS alert
              await sendEmergencySMS(latitude, longitude);

              if (Platform.OS === "android") {
                ToastAndroid.show("False Alarm Alert Sent!", ToastAndroid.SHORT);
              } else {
                Alert.alert("Success", "False alarm alert has been sent!");
              }
            } catch (error) {
              console.error("Error triggering false alarm:", error);
              Alert.alert("Error", "Failed to send false alarm alert. Please try again.");
            }
          },
        },
      ]
    );
  };

  // Trigger Instant Aid
  const triggerInstantAid = async () => {
    Alert.alert(
      "Trigger Instant Aid",
      "This will send an instant aid request to nearby users. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              const location = await getCurrentLocation();
              if (!location) return;

              const { latitude, longitude } = location;

              // Save alert to Firebase
              await saveAlert({
                title: "Instant Aid Request",
                description: "User requested immediate assistance from nearby users",
                location: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
                user: userEmail,
                type: "instant_aid",
                severity: "High",
                status: "New",
                latitude,
                longitude,
                nearbyUsers: contacts.map(c => c.phone).filter(Boolean) as string[],
              });

              // Send SMS alert
              await sendEmergencySMS(latitude, longitude);

              if (Platform.OS === "android") {
                ToastAndroid.show("Instant Aid Request Sent!", ToastAndroid.SHORT);
              } else {
                Alert.alert("Success", "Instant aid request has been sent!");
              }
            } catch (error) {
              console.error("Error triggering instant aid:", error);
              Alert.alert("Error", "Failed to send instant aid request. Please try again.");
            }
          },
        },
      ]
    );
  };

  const avatarLetter = userEmail ? userEmail.charAt(0).toUpperCase() : "?";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons
          name="chevron-back"
          size={32}
          color="#222"
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>Silent SOS</Text>
        <View style={styles.headerRight}>
          <Ionicons name="notifications-outline" size={24} color="#E04848" />
          <TouchableOpacity onPress={() => router.push("/Profile")}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.description}>
          Trigger emergency alerts discreetly. These alerts will be sent to your emergency contacts and logged in the system.
        </Text>

        <View style={styles.alertsContainer}>
          {/* False Alarm Button */}
          <TouchableOpacity style={styles.alertButton} onPress={triggerFalseAlarm}>
            <View style={styles.alertIcon}>
              <MaterialCommunityIcons
                name="alarm-light-outline"
                size={32}
                color="#E04848"
              />
            </View>
            <Text style={styles.alertTitle}>False Alarm</Text>
            <Text style={styles.alertDesc}>
              Trigger a motion sensor false alarm alert
            </Text>
          </TouchableOpacity>

          {/* Instant Aid Button */}
          <TouchableOpacity style={styles.alertButton} onPress={triggerInstantAid}>
            <View style={styles.alertIcon}>
              <MaterialCommunityIcons
                name="hand-heart-outline"
                size={32}
                color="#E04848"
              />
            </View>
            <Text style={styles.alertTitle}>Instant Aid</Text>
            <Text style={styles.alertDesc}>
              Request immediate assistance from nearby users
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#666" />
          <Text style={styles.infoText}>
            Alerts will include your current location and be sent to all emergency contacts.
            These alerts are also logged in the admin system for monitoring.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 50,
    height: 100,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: "#222",
    flex: 1,
    textAlign: "center",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FDECEC",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 18, fontWeight: "700", color: "#E04848" },
  content: { flex: 1, paddingHorizontal: 20 },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  alertsContainer: {
    gap: 20,
    marginBottom: 30,
  },
  alertButton: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ececec",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FDF3F3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  alertDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    alignItems: "flex-start",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
});
