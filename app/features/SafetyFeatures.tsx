// SafetyFeatures.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BackHandler,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../components/ThemeContext";
import { auth } from "../../firebaseConfig";

const STORAGE_KEYS = {
  fakeCall: "fakeCallEnabled",
  locationAlerts: "locationAlertsEnabled",
};

type FeatureStatus = "granted" | "denied";

export default function SafetyFeatures() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [fakeCallEnabled, setFakeCallEnabled] = useState(false);
  const [locationAlertsEnabled, setLocationAlertsEnabled] = useState(false);

  const [fakeCallStatus, setFakeCallStatus] =
    useState<FeatureStatus>("denied");
  const [locationStatus, setLocationStatus] =
    useState<FeatureStatus>("denied");

  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [loading, setLoading] = useState(true);

  /* ------------------ INITIAL LOAD (MATCH ENABLE PAGE) ------------------ */
  useEffect(() => {
    const loadState = async () => {
      try {
        const user = auth.currentUser;
        if (!user?.email) return;

        const completedKey = `safety_completed_${user.email}`;
        const completed = await AsyncStorage.getItem(completedKey);

        const comingFromSettings = completed === "true";
        setIsFirstLaunch(!comingFromSettings);

        if (comingFromSettings) {
          // Load saved state
          const fake = await AsyncStorage.getItem(STORAGE_KEYS.fakeCall);
          const loc = await AsyncStorage.getItem(
            STORAGE_KEYS.locationAlerts
          );

          setFakeCallEnabled(fake === "true");
          setLocationAlertsEnabled(loc === "true");

          setFakeCallStatus(fake === "true" ? "granted" : "denied");
          setLocationStatus(loc === "true" ? "granted" : "denied");
        } else {
          // First time → all OFF
          setFakeCallEnabled(false);
          setLocationAlertsEnabled(false);
          setFakeCallStatus("denied");
          setLocationStatus("denied");
        }
      } catch (e) {
        console.warn("SafetyFeatures load error", e);
        setIsFirstLaunch(true);
      } finally {
        setLoading(false);
      }
    };

    loadState();
  }, []);

  /* ------------------ BACK BUTTON ------------------ */
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isFirstLaunch) {
          router.replace("/features/EnablePermissions");
        } else {
          router.replace("/(tabs)/Settings");
        }
        return true;
      }
    );

    return () => backHandler.remove();
  }, [isFirstLaunch]);

  const allEnabled = fakeCallEnabled && locationAlertsEnabled;

  if (loading) return null;


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? "#111" : "#fff" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: isDark ? "#333" : "#E5E5E5" }]}>
        <TouchableOpacity
          style={{ width: 32 }}
          onPress={() => {
            if (isFirstLaunch) {
              router.replace("/features/EnablePermissions");
            } else {
              router.replace("/(tabs)/Settings");
            }
          }}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={isDark ? "#fff" : "#000"}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? "#fff" : "#000" },
          ]}
          numberOfLines={1}
        >
          {t('safetyFeatures')}
        </Text>

        {/* right spacer for perfect center */}
        <View style={{ width: 32 }} />
      </View>

      <ScrollView>
        <View style={styles.groupBox}>
          {/* Fake Call */}
          <View style={[styles.featureCard, { backgroundColor: isDark ? "#222" : "#FAFAFA" }]}>
            <View style={styles.featureContent}>
              <View style={styles.iconCircle}>
                <Ionicons name="call" size={22} color="#E04848" />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={[styles.cardTitle, { color: isDark ? "#fff" : "#000" }]}>{t('fakeCall')}</Text>
                <Text style={[styles.cardDesc, { color: isDark ? "#aaa" : "#7C7C80" }]}>
                  {t('fakeCallDescription')}
                </Text>
                <Text
                  style={[
                    styles.statusText,
                    { color: fakeCallEnabled ? "#E04848" : "#999" },
                  ]}
                >
                  {fakeCallEnabled ? t('enabled') : t('off')}
                </Text>
              </View>
            </View>

            <Switch
              value={fakeCallEnabled}
              onValueChange={async (value) => {
                setFakeCallEnabled(value);
                setFakeCallStatus(value ? "granted" : "denied");
                await AsyncStorage.setItem(
                  STORAGE_KEYS.fakeCall,
                  value.toString()
                );
              }}
              trackColor={{ false: "#E8E8E8", true: "#FFE5E5" }}
              thumbColor={fakeCallEnabled ? "#E04848" : "#fff"}
            />
          </View>

          {/* Location Alerts */}
          <View style={[styles.featureCard, { backgroundColor: isDark ? "#222" : "#FAFAFA" }]}>
            <View style={styles.featureContent}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="map-marker-alert"
                  size={22}
                  color="#E04848"
                />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={[styles.cardTitle, { color: isDark ? "#fff" : "#000" }]}>{t('locationAlerts')}</Text>
                <Text style={[styles.cardDesc, { color: isDark ? "#aaa" : "#7C7C80" }]}>
                  {t('locationAlertsDescription')}
                </Text>
                <Text
                  style={[
                    styles.statusText,
                    { color: locationAlertsEnabled ? "#E04848" : "#999" },
                  ]}
                >
                  {locationAlertsEnabled ? t('enabled') : t('off')}
                </Text>
              </View>
            </View>

            <Switch
              value={locationAlertsEnabled}
              onValueChange={async (value) => {
                setLocationAlertsEnabled(value);
                setLocationStatus(value ? "granted" : "denied");
                await AsyncStorage.setItem(
                  STORAGE_KEYS.locationAlerts,
                  value.toString()
                );
              }}
              trackColor={{ false: "#E8E8E8", true: "#FFE5E5" }}
              thumbColor={locationAlertsEnabled ? "#E04848" : "#fff"}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Section (EXACT LIKE ENABLE PAGE) */}
      {isFirstLaunch && (
        <View style={styles.bottomSection}>
          {allEnabled ? (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={async () => {
                const user = auth.currentUser;
                if (user?.email) {
                  // Mark onboarding as complete for login redirect
                  await AsyncStorage.setItem(
                    `first_login_${user.email}`,
                    "true"
                  );
                  // Also mark safety features as completed
                  await AsyncStorage.setItem(
                    `safety_completed_${user.email}`,
                    "true"
                  );
                }
                router.replace("/(tabs)/Homepage");
              }}
            >
              <Text style={styles.continueButtonText}>{t('getStarted')}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.pendingText}>
              {t('enableAllSafetyFeatures')}
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

/* ------------------ STYLES ------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },


  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },


  groupBox: { paddingHorizontal: 12, marginTop: 16 },

  featureCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FAFAFA",
    marginBottom: 16,
    elevation: 2,
  },

  featureContent: { flexDirection: "row", alignItems: "center", flex: 1 },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF2F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  featureTextBox: { flex: 1 },

  cardTitle: { fontSize: 16.5, fontWeight: "700" },
  cardDesc: { fontSize: 13.5, color: "#7C7C80", marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: "600", marginTop: 6 },

  bottomSection: {
    alignItems: "center",
    marginBottom: 20,
    minHeight: 80,
    justifyContent: "center",
  },

  pendingText: {
    color: "#F76E64",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  continueButton: {
    backgroundColor: "#E04848",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },

  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});