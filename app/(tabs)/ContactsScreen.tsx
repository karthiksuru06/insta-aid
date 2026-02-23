import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Accelerometer } from "expo-sensors";
import * as SMS from "expo-sms";
import { arrayRemove, doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View
} from "react-native";
import AnnouncementButton from '../../components/AnnouncementButton';
import AppHeader from '../../components/AppHeader';
import { AvatarComponent } from "../../components/AvatarComponent";
import NeedHelpFab from "../../components/NeedHelpFab";
import NotificationButton from '../../components/NotificationButton';
import { useTheme } from "../../components/ThemeContext";
import { auth, db } from "../../firebaseConfig";
import { getUserData } from "../../services/firebaseServices";


// --- Helper: calculate distance in meters ---
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // meters
  const φ1 = lat1 * (Math.PI / 180);
  const φ2 = lat2 * (Math.PI / 180);
  const Δφ = (lat2 - lat1) * (Math.PI / 180);
  const Δλ = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type Contact = {
  name?: string;
  phone?: string;
  relation?: string;
  avatarURL?: string;
};

export default function ContactsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState(auth.currentUser);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(300)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("U");
  const [isShakeDetectionOn, setIsShakeDetectionOn] = useState(false);

  const lastShakeRef = useRef(0);
  const shakeCountRef = useRef(0);
  const subscriptionRef = useRef<null | { remove: () => void }>(null);

  const DISTANCE_THRESHOLD = 5;
  const isDark = theme === "dark";
  const ICON_COLOR = "#FF6B6B";

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setContacts(snap.data().emergencyContacts ?? []);
    });
  }, [user]);

  useEffect(() => {
    AsyncStorage.getItem("shakeDetectionEnabled").then(val => {
      if (val !== null) setIsShakeDetectionOn(val === "true");
    });
  }, []);

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    subscriptionRef.current = Accelerometer.addListener(async (data) => {
      const { x, y, z } = data;
      const acc = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
      const now = Date.now();
      if (acc > 1.6 && now - lastShakeRef.current > 1000) {
        lastShakeRef.current = now;
        shakeCountRef.current += 1;
        if (shakeCountRef.current >= 3) {
          shakeCountRef.current = 0;
          if (!isShakeDetectionOn) {
            Alert.alert(t('alerts.enableShakeDetection'), t('alerts.shakeAlertModeRequired'), [
              {
                text: t('alerts.turnOn'), onPress: async () => {
                  await AsyncStorage.setItem('shakeDetectionEnabled', 'true');
                  setIsShakeDetectionOn(true);
                }
              },
              { text: t('alerts.cancel'), style: 'cancel' }
            ]);
            return;
          }
          await onShakeDetected();
          if (Platform.OS === "android") ToastAndroid.show("Emergency Shake Detected!", ToastAndroid.SHORT);
          else Alert.alert("Emergency Shake Detected!");
        }
      }
    });
    const reset = setInterval(() => (shakeCountRef.current = 0), 4000);
    return () => { subscriptionRef.current?.remove(); clearInterval(reset); };
  }, [contacts, isShakeDetectionOn]);

  async function onShakeDetected() {
    try {
      if (!user) return;
      const contactPhones = contacts.map(c => c.phone).filter((p): p is string => !!p);
      if (contactPhones.length === 0) return;
      let coordsLink = "location unavailable";
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        coordsLink = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
      }
      if (await SMS.isAvailableAsync()) {
        await SMS.sendSMSAsync(contactPhones, `🚨 I need help! My location: ${coordsLink}`);
      }
    } catch (e) { console.warn(e); }
  }

  useEffect(() => {
    if (user) {
      getUserData(user.uid).then(userData => {
        setProfileImageUrl(userData?.profileImageUrl || null);
        setUserEmail(userData?.email || user.email || "U");
      });
    }
  }, [user]);

  const deleteContact = async (contact: Contact) => {
    try {
      if (!user) return;
      await updateDoc(doc(db, "users", user.uid), { emergencyContacts: arrayRemove(contact) });
    } catch { Alert.alert(t('errorTitle'), t('failedToDeleteContact')); }
  };

  const openModal = (contact: Contact | null = null) => {
    setSelectedContact(contact);
    if (contact) {
      setEditName(contact.name || "");
      setEditPhone(contact.phone || "");
      setSelectedIndex(contacts.findIndex(c => c.phone === contact.phone));
    } else {
      setEditName("");
      setEditPhone("");
      setSelectedIndex(null);
    }
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0.45, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 260, useNativeDriver: true })
    ]).start();
  };

  const closeEditModal = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 300, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true })
    ]).start(() => setModalVisible(false));
  };

  const confirmEditContact = async () => {
    if (!editName.trim() || !editPhone.trim()) return;
    try {
      const newContacts = [...contacts];
      if (selectedIndex !== null && selectedIndex >= 0) newContacts[selectedIndex] = { ...newContacts[selectedIndex], name: editName.trim(), phone: editPhone.trim() };
      else newContacts.push({ name: editName.trim(), phone: editPhone.trim() });
      setContacts(newContacts);
      if (user) await updateDoc(doc(db, 'users', user.uid), { emergencyContacts: newContacts });
      closeEditModal();
    } catch { Alert.alert(t('errorTitle'), t('addNewContactPage.addFailed')); }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#111" : "#FFF" }]}>
      <AppHeader
        title={t('emergencyContacts')}
        onBack={() => router.back()}
        right={(
          <View style={styles.headerRightContent}>
            <AnnouncementButton color="#FF6B6B" />
            <NotificationButton color="#FF6B6B" />
            <TouchableOpacity onPress={() => router.push('/(tabs)/Profile')} style={styles.avatarWrapper}>
              <AvatarComponent
                image={profileImageUrl}
                email={userEmail}
                size={28}
                backgroundColor="#FF6B6B"
              />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={[styles.addButton, { backgroundColor: isDark ? '#FF6464' : '#FF6464' }]} onPress={() => openModal()}>
        <Text style={styles.addButtonText}>{t('addNewContact')}</Text>
      </TouchableOpacity>

      <FlatList
        data={contacts}
        keyExtractor={(_item, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: isDark ? "#222" : "#F8F8F8" }]}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? "#333" : "#E8E8E8" }]}>
              <Text style={[styles.avatarLetter, { color: isDark ? "#ccc" : "#777" }]}>{item.name?.[0]?.toUpperCase() || "?"}</Text>
            </View>
            <View style={styles.details}>
              <Text style={[styles.name, { color: isDark ? "#fff" : "#222" }]}>{item.name}</Text>
              <Text style={[styles.phone, { color: isDark ? "#ccc" : "#555" }]}>{item.phone}</Text>
            </View>
            <View style={styles.icons}>
              <TouchableOpacity onPress={() => openModal(item)} style={styles.iconButton}>
                <Ionicons name="pencil-outline" size={22} color={isDark ? "#ccc" : "#444"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteContact(item)} style={styles.iconButton}>
                <Ionicons name="trash-outline" size={22} color="#FF6464" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={[styles.emptyText, { color: isDark ? "#ccc" : "#777" }]}>{t('noEmergencyContacts')}</Text></View>}
        ListFooterComponent={<TouchableOpacity style={styles.testShakeButton} onPress={onShakeDetected}><Text style={styles.testShakeButtonText}>{t('testShakeAlert')}</Text></TouchableOpacity>}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {modalVisible && (
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeEditModal}>
            <Animated.View style={[styles.overlayShadow, { opacity: overlayOpacity }]} />
          </TouchableOpacity>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY }] }]} pointerEvents="box-none">
            <Animated.View style={[styles.modalCard, { backgroundColor: isDark ? '#1a1a1a' : '#FFF', transform: [{ scale: scaleAnim }] }]}>
              <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#111' }]}>{selectedContact ? t('addNewContactPage.editTitle') : t('addNewContactPage.title')}</Text>
              <Text style={[styles.inputLabel, { color: isDark ? '#ccc' : '#666' }]}>{t('addNewContactPage.nameLabel')}</Text>
              <TextInput value={editName} onChangeText={setEditName} placeholder={t('addNewContactPage.namePlaceholder')} placeholderTextColor={isDark ? '#555' : '#AAA'} style={[styles.input, { backgroundColor: isDark ? '#2a2a2a' : '#F6F6F6', color: isDark ? '#fff' : '#111' }]} />
              <Text style={[styles.inputLabel, { color: isDark ? '#ccc' : '#666', marginTop: 12 }]}>{t('addNewContactPage.phoneLabel')}</Text>
              <TextInput value={editPhone} onChangeText={setEditPhone} placeholder={t('addNewContactPage.phonePlaceholder')} placeholderTextColor={isDark ? '#555' : '#AAA'} keyboardType="phone-pad" style={[styles.input, { backgroundColor: isDark ? '#2a2a2a' : '#F6F6F6', color: isDark ? '#fff' : '#111' }]} />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={[styles.modalButtonOutline, { borderColor: isDark ? '#444' : '#CCC' }]} onPress={closeEditModal}>
                  <Text style={[styles.modalButtonText, { color: isDark ? '#fff' : '#333' }]}>{t('addNewContactPage.cancelButton')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButtonFilled, { backgroundColor: '#FF6464' }]} onPress={confirmEditContact}>
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>{selectedContact ? t('confirm') : t('addNewContactPage.addButton')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      )}
      <NeedHelpFab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRightContent: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { marginLeft: 0 },
  profileAvatar: { width: 28, height: 28, borderRadius: 14 },
  addButton: { marginHorizontal: 20, marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  card: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginTop: 12, padding: 12, borderRadius: 16 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarLetter: { fontSize: 18, fontWeight: "700" },
  details: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700" },
  phone: { fontSize: 13, marginTop: 2 },
  icons: { flexDirection: "row" },
  iconButton: { padding: 8, marginLeft: 4 },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 15 },
  testShakeButton: { marginHorizontal: 20, marginTop: 24, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 2, borderColor: "#FF6464" },
  testShakeButtonText: { color: "#FF6464", fontWeight: "700" },
  modalOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
  overlayShadow: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  modalContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', borderRadius: 24, padding: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  inputLabel: { fontSize: 13, marginBottom: 8 },
  input: { borderRadius: 12, padding: 12, fontSize: 16 },
  modalButtonRow: { flexDirection: 'row', marginTop: 24, gap: 12 },
  modalButtonOutline: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  modalButtonFilled: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  modalButtonText: { fontWeight: '700', fontSize: 15 },
});
