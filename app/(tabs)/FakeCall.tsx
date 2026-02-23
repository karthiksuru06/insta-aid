import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  ListRenderItem,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../components/ThemeContext";
import { useFakeCall } from "../../contexts/FakeCallContext";
import { auth, db } from "../../firebaseConfig";

/* ---------------- TYPES ---------------- */
type Caller = {
  id: string;
  name: string;
  avatar: string;
  voiceType: string;
};

/* ---------------- VOICE DETECTION ---------------- */
const getVoiceType = (relation?: string, name?: string) => {
  const text = (relation || name || "").toLowerCase();
  if (text.includes("police")) return "police";
  if (text.includes("doctor")) return "doctor";
  if (text.includes("brother")) return "brother";
  if (text.includes("principal")) return "principal";
  if (text.includes("delivery")) return "delivery";
  return "unknown";
};

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/* ---------------- COMPONENT ---------------- */
export default function FakeCallApp() {
  const router = useRouter();
  const { theme } = useTheme();
  const { triggerFakeCall } = useFakeCall();
  const { t } = useTranslation();

  /* ---------------- DEFAULT FAKE CONTACTS ---------------- */
  const defaultCallers = useMemo<Caller[]>(() => [
    {
      id: "default-1",
      name: t('fakecall.policeControlRoom', 'Police Control Room'),
      avatar: "https://randomuser.me/api/portraits/men/1.jpg",
      voiceType: "police",
    },
    {
      id: "default-2",
      name: t('fakecall.doctorAnanya', 'Doctor Ananya'),
      avatar: "https://randomuser.me/api/portraits/women/2.jpg",
      voiceType: "doctor",
    },
    {
      id: "default-3",
      name: t('fakecall.brotherRamesh', 'Brother Ramesh'),
      avatar: "https://randomuser.me/api/portraits/men/3.jpg",
      voiceType: "brother",
    },
    {
      id: "default-4",
      name: t('fakecall.schoolPrincipal', 'School Principal'),
      avatar: "https://randomuser.me/api/portraits/women/4.jpg",
      voiceType: "principal",
    },
    {
      id: "default-5",
      name: t('fakecall.deliveryService', 'Delivery Service'),
      avatar: "https://randomuser.me/api/portraits/men/6.jpg",
      voiceType: "delivery",
    },
  ], [t]);

  const [contacts, setContacts] = useState<Caller[]>(defaultCallers);

  // Update contacts when translation changes
  useEffect(() => {
    setContacts(prev => {
      // Keep firebase contacts (those starting with firebase-) and replace errors defaults
      const firebaseContacts = prev.filter(c => c.id.startsWith('firebase-'));
      return [...defaultCallers, ...firebaseContacts];
    });
  }, [defaultCallers]);

  /* ---------------- LOAD FIREBASE CONTACTS ---------------- */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);

    const unsub = onSnapshot(userDocRef, (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      const emergencyContacts = data.emergencyContacts || [];

      const firebaseContacts: Caller[] = emergencyContacts.map(
        (c: any, index: number) => ({
          id: `firebase-${index}`,
          name: c.name || t('fakecall.unknownCaller', "Unknown Caller"),
          avatar:
            c.avatarURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              c.name || "Caller"
            )}`,
          voiceType: getVoiceType(c.relation, c.name),
        })
      );

      // 🔥 MERGE DEFAULT + FIREBASE CONTACTS
      setContacts([...defaultCallers, ...firebaseContacts]);
    });

    return () => unsub();
  }, [defaultCallers]);

  /* ---------------- HANDLE FAKE CALL ---------------- */
  const handleFakeCall = async (item: Caller) => {
    try {
      // Trigger fake call via context (will show incoming notification)
      await triggerFakeCall(item);

      // Navigate to call screen
      router.push({
        pathname: "/(tabs)/CallScreen",
        params: {
          callerName: item.name,
          profileUri: encodeURIComponent(item.avatar),
          voiceType: item.voiceType,
        },
      });
    } catch (error) {
      console.error('Error triggering fake call:', error);
    }
  };

  /* ---------------- RENDER ITEM ---------------- */
  const renderItem: ListRenderItem<Caller> = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme === "dark" ? "#222" : "#fafafa" },
      ]}
      onPress={() => handleFakeCall(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <Text
          style={[
            styles.cardTitle,
            { color: theme === "dark" ? "#fff" : "#000" },
          ]}
        >
          {item.name}
        </Text>
      </View>

      <View style={{
        backgroundColor: '#fd3c4a',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <MaterialCommunityIcons
          name="phone"
          size={20}
          color="#fff"
        />
      </View>
    </TouchableOpacity>
  );

  /* ---------------- UI ---------------- */
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme === "dark" ? "#111" : "#fff" },
      ]}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      {/* NAV BAR */}
      <View
        style={[
          styles.navBar,
          { borderBottomColor: theme === "dark" ? "#333" : "#eee" },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme === "dark" ? "#fff" : "#333"}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.navTitle,
            { color: theme === "dark" ? "#fff" : "#333", flex: 1, textAlign: "center" },
          ]}
        >
          {t('fakeCallTitle', 'Fake Call')}
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={contacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      />
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: "space-between",
  },
  cardLeft: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 16 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
});
