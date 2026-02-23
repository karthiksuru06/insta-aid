import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
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
import { useFakeCall } from "../../contexts/FakeCallContext";

type Caller = {
  id: string;
  name: string;
  avatar: string;
  voiceType: string;
};

export default function FakeCallApp() {
  const router = useRouter();
  const { triggerFakeCall } = useFakeCall();
  const { t } = useTranslation();

  const DATA: Caller[] = [
    {
      id: "1",
      name: t("fakecall.policeControlRoom"),
      avatar: "https://randomuser.me/api/portraits/men/1.jpg",
      voiceType: "police",
    },
    {
      id: "2",
      name: t("fakecall.doctorAnanya"),
      avatar: "https://randomuser.me/api/portraits/women/2.jpg",
      voiceType: "doctor",
    },
    {
      id: "3",
      name: t("fakecall.brotherRamesh"),
      avatar: "https://randomuser.me/api/portraits/men/3.jpg",
      voiceType: "brother",
    },
    {
      id: "4",
      name: t("fakecall.schoolPrincipal"),
      avatar: "https://randomuser.me/api/portraits/women/4.jpg",
      voiceType: "principal",
    },
    {
      id: "5",
      name: t("fakecall.unknownCaller"),
      avatar: "https://randomuser.me/api/portraits/lego/5.jpg",
      voiceType: "unknown",
    },
    {
      id: "6",
      name: t("fakecall.deliveryService"),
      avatar: "https://randomuser.me/api/portraits/men/6.jpg",
      voiceType: "delivery",
    },
  ];

  const handleFakeCall = async (item: Caller) => {
    console.log("Navigating to CallScreen:", item.name);

    // Trigger fake call via context (will show incoming notification)
    await triggerFakeCall(item);

    router.push({
      pathname: "/(tabs)/CallScreen", // ✅ absolute path
      params: {
        callerName: item.name,
        profileUri: encodeURIComponent(item.avatar),
        voiceType: item.voiceType,
      },
    });
  };

  const renderItem: ListRenderItem<Caller> = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleFakeCall(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <Text style={styles.cardTitle}>{item.name}</Text>
      </View>

      <View style={styles.phoneButton}>
        <MaterialCommunityIcons
          name="phone-outline"
          size={24}
          color="#fd3c4a"
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{t("fakecall.title")}</Text>
      </View>

      <FlatList
        data={DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 80,
  },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    position: "relative",
  },
  backButton: { zIndex: 1 },
  navTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: "space-between",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  phoneButton: {
    padding: 10,
    borderRadius: 22,
  },
});
