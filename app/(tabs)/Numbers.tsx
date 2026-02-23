import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AvatarComponent } from "../../components/AvatarComponent";
import { useTheme } from "../../components/ThemeContext";
import { useNotifications } from "../../contexts/NotificationContext";

import AnnouncementButton from "../../components/AnnouncementButton";
import AppHeader from "../../components/AppHeader";
import NeedHelpFab from "../../components/NeedHelpFab";
import NotificationButton from "../../components/NotificationButton";
import { getUserData } from "../../services/firebaseServices";
import { auth, db } from "../../utils/firebaseConfig";

/* ================= TYPES ================= */

type EmergencyItem = {
  id: string;
  category: string;
  name: string;
  number: string;
  icon: string;
};

type WebsiteItem = {
  id: string;
  name: string;
  url: string;
};

/* ================= HELPERS ================= */

const groupByCategory = (data: EmergencyItem[]) => {
  const grouped: Record<string, EmergencyItem[]> = {};
  data.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });
  return grouped;
};

/* ================= CATEGORY ================= */

const CATEGORY_MAP: Record<string, string> = {
  policeSafety: "Police & Safety",
  medicalFire: "Medical & Fire",
  disasterCrisis: "Disaster & Crisis",
  supportHotlines: "Support Hotlines",
};

const CATEGORY_KEYS = Object.keys(CATEGORY_MAP);

/* ================= COLORS ================= */

const PRIMARY = "#FF6B6B";
const LIGHT = "#FFF4F4";
const BORDER = "#FFDCDC";

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },

  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRightContent: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { marginLeft: 0 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    margin: 16,
    borderWidth: 1,
  },

  searchInput: { marginLeft: 8, flex: 1 },

  section: { marginBottom: 20 },

  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },

  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },

  websiteCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },

  left: { flexDirection: "row", alignItems: "center" },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  name: { fontSize: 15, fontWeight: "600" },

  number: { fontSize: 13, color: "#6E6E6E" },

  callButton: {
    width: 34,
    height: 34,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});

/* ================= COMPONENT ================= */

export default function EmergencyNumbers() {
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();
  const { t } = useTranslation();
  const router = useRouter();

  const isDark = theme === "dark";
  const headerBgColor = isDark ? "#111" : "#FFF";
  const headerTextColor = isDark ? "#FFF" : "#000";

  const ICON_COLOR = "#FF6B6B";

  const [emergencyData, setEmergencyData] = useState<EmergencyItem[]>([]);
  const [websiteData, setWebsiteData] = useState<WebsiteItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [userEmailForAvatar, setUserEmailForAvatar] = useState("U");

  /* USER */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (user) {
        try {
          const data = await getUserData(user.uid);
          if (data) {
            // Match Settings.tsx logic for profile image and email
            setProfileImageUrl(data.photoURL || data.profileImageUrl || null);
            setUserEmailForAvatar(data.email || user.email || "U");
          } else {
            setUserEmailForAvatar(user.email || "U");
          }
        } catch (e) {
          console.warn("Numbers: Failed to load user data", e);
          setUserEmailForAvatar(user.email || "U");
        }
      }
    });
    return unsub;
  }, []);

  /* FIRESTORE */
  useEffect(() => {
    const unsubNumbers = onSnapshot(collection(db, "emergency_numbers"), snap => {
      setEmergencyData(
        snap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<EmergencyItem, "id">),
        }))
      );
      setLoading(false);
    });

    const unsubWebsites = onSnapshot(collection(db, "emergency_websites"), snap => {
      setWebsiteData(
        snap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<WebsiteItem, "id">),
        }))
      );
    });

    return () => {
      unsubNumbers();
      unsubWebsites();
    };
  }, []);

  const groupedData = groupByCategory(
    emergencyData.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase())
    )
  );

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: isDark ? "#111" : "#FFF" }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={{ color: isDark ? "#FFF" : "#000", marginTop: 10 }}>
          {t("loadingEmergencyServices")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#111" : "#FFF" }]}>

      <AppHeader
        title={t("emergencyNumbers")}
        onBack={() => router.back()}
        right={(
          <View style={styles.headerRightContent}>
            <AnnouncementButton color="#FF6B6B" />
            <NotificationButton color="#FF6B6B" />
            <TouchableOpacity onPress={() => router.push("/(tabs)/Profile")} style={styles.avatarWrapper}>
              <AvatarComponent
                image={profileImageUrl}
                email={userEmailForAvatar}
                size={28}
                backgroundColor="#FF6B6B"
              />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* SEARCH */}
      <View style={[styles.searchBox, {
        backgroundColor: isDark ? "#1a1a1a" : "#FFF9F9",
        borderColor: isDark ? "#333" : "#FFECEC",
      }]}>
        <Ionicons name="search-outline" size={18} color={isDark ? "#ccc" : "#999"} />
        <TextInput
          placeholder={t("searchEmergencyServices")}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: isDark ? "#fff" : "#000" }]}
          placeholderTextColor={isDark ? "#ccc" : "#999"}
        />
      </View>

      {/* LIST remains SAME */}
      <FlatList
        data={CATEGORY_KEYS}
        keyExtractor={item => item}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        renderItem={({ item: key }) => {
          const items = groupedData[CATEGORY_MAP[key]];
          if (!items?.length) return null;

          return (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
                {t(`categories.${key}`)}
              </Text>

              {items.map(item => (
                <View key={item.id} style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? "#222" : "#fff",
                    borderColor: isDark ? "#333" : BORDER
                  }
                ]}>
                  <View style={styles.left}>
                    <View style={[
                      styles.iconBox,
                      { backgroundColor: isDark ? "#2a2a2a" : LIGHT }
                    ]}>
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={20}
                        color={PRIMARY}
                      />
                    </View>

                    <View>
                      <Text style={[styles.name, { color: isDark ? "#fff" : "#000" }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.number, { color: isDark ? "#ccc" : "#6E6E6E" }]}>
                        {item.number}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => Linking.openURL(`tel:${item.number}`)}>
                    <Ionicons name="call" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
              {t("websites")}
            </Text>

            {websiteData.map(site => (
              <TouchableOpacity key={site.id} style={[
                styles.websiteCard,
                {
                  backgroundColor: isDark ? "#222" : "#fff",
                  borderColor: isDark ? "#333" : BORDER
                }
              ]} onPress={() => Linking.openURL(site.url)}>
                <Text style={[styles.name, { color: isDark ? "#fff" : "#000" }]}>
                  {site.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        }
      />
      <NeedHelpFab />
    </View>
  );
}
