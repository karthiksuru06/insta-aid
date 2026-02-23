import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../components/ThemeContext";
import { useTranslation } from "react-i18next";

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme === "dark" ? "#111" : "#fff" },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingTop: 50,
      height: 100,
      marginBottom: 20,
    },
    headerTitle: { fontSize: 23, fontWeight: "700", color: theme === "dark" ? "#fff" : "#222", flex: 1, textAlign: "center" },
    content: { paddingHorizontal: 18 },
    text: { fontSize: 16, color: theme === "dark" ? "#ccc" : "#555" },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.headerRow}>
        <Ionicons name="chevron-back" size={32} color={theme === "dark" ? "#fff" : "#222"} onPress={() => router.back()} />
        <Text style={dynamicStyles.headerTitle}>{t('notificationsPage')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={dynamicStyles.content}>
        <Text style={dynamicStyles.text}>{t('alerts.noNotifications')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
