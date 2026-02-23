import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnnouncementButton from '../../components/AnnouncementButton';
import AppHeader from '../../components/AppHeader';
import { AvatarComponent } from "../../components/AvatarComponent";
import NeedHelpFab from "../../components/NeedHelpFab";
import NotificationButton from '../../components/NotificationButton';
import { useTheme } from "../../components/ThemeContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { getUserData } from "../../services/firebaseServices";
import { auth } from "../../utils/firebaseConfig";

const SettingsScreen = () => {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("U");

  /* USER DATA for Header */
  useEffect(() => {
    const { onAuthStateChanged } = require("firebase/auth");
    const unsub = onAuthStateChanged(auth, async (user: any) => {
      if (user) {
        try {
          const data = await getUserData(user.uid);
          if (data) {
            setProfileImageUrl(data.photoURL || data.profileImageUrl || null);
            setUserEmail(data.email || user.email || "U");
          } else {
            setUserEmail(user.email || "U");
          }
        } catch (e) {
          console.warn("Settings: Failed to load user data", e);
        }
      }
    });
    return () => unsub();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme === "dark" ? "#111" : "#FFF" }]}>
      <AppHeader
        title={t('settings')}
        onBack={() => router.replace("/Homepage")}
        right={(
          <View style={styles.headerRightContent}>
            <AnnouncementButton color="#FF6B6B" />
            <NotificationButton color="#FF6B6B" />
            <TouchableOpacity onPress={() => router.push("/(tabs)/Profile")} style={styles.avatarWrapper}>
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

      {/* 🔹 Content */}
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: theme === "dark" ? "#111" : "#FFF" }]}>
        <Text style={[styles.sectionHeader, { color: theme === "dark" ? "#ccc" : "#666" }]}>{t('profile')}</Text>

        <TouchableOpacity
          style={[styles.item, { backgroundColor: theme === "dark" ? "#222" : "#fff" }]}
          onPress={() => router.push("../EditProfile")}
        >
          <Ionicons name="person-outline" size={22} color="#FF3B30" />
          <Text style={[styles.itemText, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('editProfile')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <Text style={[styles.sectionHeader, { color: theme === "dark" ? "#ccc" : "#666" }]}>{t('appSettings')}</Text>

        <TouchableOpacity
          style={[styles.item, { backgroundColor: theme === "dark" ? "#222" : "#fff" }]}
          onPress={() => router.push("/features/EnablePermissions")}
        >
          <Ionicons name="lock-closed-outline" size={22} color="#FF3B30" />
          <Text style={[styles.itemText, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('enablePermissions')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, { backgroundColor: theme === "dark" ? "#222" : "#fff" }]}
          onPress={() => router.push("/language")}
        >
          <Ionicons name="language-outline" size={22} color="#FF3B30" />
          <Text style={[styles.itemText, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('languages')}</Text>
          <Text style={[styles.extraText, { color: theme === "dark" ? "#ccc" : "#999" }]}>{t('english')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <View style={[styles.item, { backgroundColor: theme === "dark" ? "#222" : "#fff" }]}>
          <Ionicons name="moon-outline" size={22} color="#FF3B30" />
          <Text style={[styles.itemText, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('darkMode')}</Text>
          <Switch
            value={theme === "dark"}
            onValueChange={toggleTheme}
            trackColor={{ true: "#FF3B30", false: "#ccc" }}
            thumbColor="#fff"
          />
        </View>

        <Text style={[styles.sectionHeader, { color: theme === "dark" ? "#ccc" : "#666" }]}>{t('helpSupport')}</Text>

        <TouchableOpacity
          style={[styles.item, { backgroundColor: theme === "dark" ? "#222" : "#fff" }]}
          onPress={() => router.push("../features/SafetyFeatures")}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color="#FF3B30"
          />
          <Text style={[styles.itemText, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('safetyFeatures')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, { backgroundColor: theme === "dark" ? "#222" : "#fff" }]}
          onPress={() => router.push("../AlertsandBackup")}
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color="#FF3B30"
          />
          <Text style={[styles.itemText, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('alerts_and_backup')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.item, { backgroundColor: theme === "dark" ? "#222" : "#fff" }]}
          onPress={() => router.push("../contactus")}
        >
          <Ionicons name="mail-outline" size={22} color="#FF3B30" />
          <Text style={[styles.itemText, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('contactUs')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </ScrollView>
      <NeedHelpFab />
    </View>
  );
};

export default SettingsScreen;

/* --------------------------------------------------
   STYLES
-------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },

  headerRightContent: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { marginLeft: 0 },


  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },

  scrollContent: { padding: 20, paddingBottom: 120 },

  sectionHeader: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#666",
    marginTop: 20,
    marginBottom: 10,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },

  itemText: { flex: 1, fontSize: 15, marginLeft: 10 },

  extraText: { fontSize: 14, color: "#999", marginRight: 5 },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderTopWidth: 1,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

  navButton: { flex: 1, alignItems: "center" },

  navLabel: {
    fontSize: 11,
    color: "#5C5652",
    marginTop: 4,
    fontWeight: "500",
  },
});
