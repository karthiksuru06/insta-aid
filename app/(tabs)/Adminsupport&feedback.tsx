// App.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import AdminProfileModal from "../../components/AdminProfileModal";
import { auth } from "../../firebaseConfig";
import {
  assignFeedback,
  fetchFeedbacks,
  resolveFeedback,
  subscribeToFeedbacks
} from "../../services/firebaseServices";

/* 🔹 Firestore Feedback Type */
interface FeedbackItem {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "NEW" | "ASSIGNED" | "RESOLVED";
  assignedTo: string | null;
  timestamp: any;
}

/* 🔹 Time formatter */
const getTimeAgo = (timestamp: any) => {
  if (!timestamp) return "Just now";
  try {
    const time = timestamp.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime();
    const diff = (Date.now() - time) / 1000;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  } catch (e) {
    return "Recently";
  }
};

export default function App() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToFeedbacks((data) => {
      // Sort by timestamp desc
      const sortedData = [...data].sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return timeB - timeA;
      });
      setFeedbacks(sortedData as FeedbackItem[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadFeedbacks = async () => {
    // Falls back to re-fetching if manual refresh triggered
    setLoading(true);
    const data: any = await fetchFeedbacks();
    setFeedbacks(data);
    setLoading(false);
  };

  /* 🔹 Render each feedback card */
  const renderItem = ({ item }: { item: FeedbackItem }) => {
    const firstLetter = item.name?.charAt(0).toUpperCase() ?? "?";

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardId}>
            {item.id.slice(0, 6).toUpperCase()}
          </Text>

          <Text
            style={[
              styles.statusBadge,
              item.status === "NEW"
                ? styles.newBadge
                : item.status === "ASSIGNED"
                  ? styles.assignedBadge
                  : styles.resolvedBadge,
            ]}
          >
            {item.status}
          </Text>
        </View>

        {/* Message */}
        <Text style={styles.cardDesc}>{item.message}</Text>

        {/* User row */}
        <View style={styles.assignedRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>

          <View>
            <Text style={styles.assignedName}>{item.name}</Text>
            <Text style={styles.openedTime}>
              Opened: {getTimeAgo(item.timestamp)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {item.status !== "RESOLVED" && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={async () => {
                await assignFeedback(item.id, "Admin");
              }}
            >
              <Ionicons name="person-add-outline" size={16} />
              <Text style={styles.actionText}>Assign</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                Linking.openURL(
                  `mailto:${item.email}?subject=Support Response`
                )
              }
            >
              <Ionicons name="mail-outline" size={16} />
              <Text style={styles.actionText}>Respond</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.resolveBtn]}
              onPress={async () => {
                await resolveFeedback(item.id);
              }}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={16}
                color="#fff"
              />
              <Text style={[styles.actionText, { color: "#fff" }]}>
                Resolve
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const adminEmail = auth.currentUser?.email || "";
  const adminInitial = adminEmail ? adminEmail.charAt(0).toUpperCase() : "U";

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ FIXED HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(tabs)/Admindashboard")}
          >
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Support & Feedback</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notificationIcon}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color="#FF5757"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileIcon}
            onPress={() => setProfileModalVisible(true)}
          >
            <Text style={styles.profileInitial}>{adminInitial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feedback List */}
      <FlatList
        data={feedbacks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={loadFeedbacks}
        contentContainerStyle={{ paddingBottom: 120 }}
      />
      {/* Admin Profile Modal */}
      <AdminProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </SafeAreaView>
  );
}

/* 🔹 STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  /* 🔥 HEADER FIX */
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },

  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: 24,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },

  profileIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFE2E2",
    justifyContent: "center",
    alignItems: "center",
  },

  profileInitial: {
    color: "#D32F2F",
    fontWeight: "bold",
    fontSize: 20,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 14,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  cardId: {
    fontWeight: "700",
    marginRight: 10,
    color: "#374151",
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
  },

  newBadge: { backgroundColor: "#16A34A", color: "#fff" },
  assignedBadge: { backgroundColor: "#F59E0B", color: "#fff" },
  resolvedBadge: { backgroundColor: "#9CA3AF", color: "#fff" },

  cardDesc: {
    color: "#4B5563",
    marginVertical: 10,
    lineHeight: 20,
  },

  assignedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },

  assignedName: { fontWeight: "700", color: "#111827" },
  openedTime: { fontSize: 12, color: "#6B7280" },

  actionRow: {
    flexDirection: "row",
    marginTop: 8,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    marginRight: 6,
  },

  actionText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "700",
  },

  resolveBtn: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
});