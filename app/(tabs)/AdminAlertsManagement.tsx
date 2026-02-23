import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminProfileModal from "../../components/AdminProfileModal";
import { auth } from "../../firebaseConfig";
import {
  fetchAlertHistory,
  fetchLiveAlerts,
} from "../../services/firebaseServices";
import AdminFilterAlertsScreen from "./AdminFilterAlerts";

/* ================= HELPERS ================= */

const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
};

const getUserDisplay = (alert: any) => {
  const name = alert.details?.contact?.name ||
    alert.details?.user?.name ||
    alert.userName ||
    alert.userEmail ||
    "Unknown User";
  return name;
};

const getUserEmail = (alert: any) => {
  return alert.userEmail || alert.details?.user?.email || alert.user || "";
};

/* ================= ICON ================= */

const renderIcon = (alert: any) => {
  const type = alert.type?.toLowerCase() || "";

  // Motion Shake - Show shake/vibrate icon
  if (type.includes("motion") || type.includes("shake")) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: "#F3E8FF" }]}>
        <Ionicons name="phone-portrait-outline" size={22} color="#9333EA" />
      </View>
    );
  }

  // Location - Show location pin icon
  if (type.includes("location")) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}>
        <Ionicons name="location" size={22} color="#2563EB" />
      </View>
    );
  }

  // Fake Call - Show phone icon
  if (type.includes("fake") || type.includes("call")) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: "#D1FAE5" }]}>
        <Ionicons name="call" size={22} color="#059669" />
      </View>
    );
  }

  // User Login/Signup - Show person icon
  if (type.includes("login") || type.includes("signup") || type.includes("user")) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: "#FEE2E2" }]}>
        <Ionicons name="person" size={22} color="#EF4444" />
      </View>
    );
  }

  // Default - Alert icon
  return (
    <View style={[styles.iconCircle, { backgroundColor: "#FFE4E6" }]}>
      <Ionicons name="alert-circle-outline" size={22} color="#BE123C" />
    </View>
  );
};

/* ================= COMPONENT ================= */

export default function AdminAlertsManagement() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const adminEmail = auth.currentUser?.email || "";
  const adminInitial = adminEmail ? adminEmail.charAt(0).toUpperCase() : "U";

  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [alertHistory, setAlertHistory] = useState<any[]>([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  /* 🔹 Time-Based Filtering Logic */
  const categorizeAlerts = (allAlerts: any[]) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000; // 1 hour in milliseconds

    const live: any[] = [];
    const history: any[] = [];

    allAlerts.forEach((alert) => {
      let alertTime = 0;
      if (alert.timestamp?.toDate) {
        alertTime = alert.timestamp.toDate().getTime();
      } else if (typeof alert.timestamp === 'number' || typeof alert.timestamp === 'string') {
        alertTime = new Date(alert.timestamp).getTime();
      }

      if (alertTime > oneHourAgo) {
        live.push(alert);
      } else {
        history.push(alert);
      }
    });

    // Sort by newest first
    live.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    history.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

    setLiveAlerts(live);
    setAlertHistory(history);
  };

  useEffect(() => {
    const loadData = async () => {
      // Fetch both and combine to apply new time-based logic
      const live = await fetchLiveAlerts();
      const hist = await fetchAlertHistory();
      const all = [...live, ...hist];

      // Remove duplicates just in case
      const uniqueAlerts = Array.from(new Map(all.map(item => [item.id, item])).values());

      if (params.filteredAlerts) {
        const filtered = JSON.parse(params.filteredAlerts as string);
        categorizeAlerts(filtered);
      } else {
        categorizeAlerts(uniqueAlerts);
      }
    };
    loadData();

    // Set up an interval to refresh the split every minute 
    // (so alerts move from live to history automatically)
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [params.filteredAlerts]);

  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ================= FILTER MODAL ================= */}
      {filterVisible && (
        <View style={styles.filterOverlay}>
          <TouchableOpacity
            style={styles.filterBackdrop}
            onPress={() => setFilterVisible(false)}
          />

          <View style={styles.filterPanel}>
            {/* Header */}
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Alerts</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={24} />
              </TouchableOpacity>
            </View>

            {/* Filter Content */}
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              <AdminFilterAlertsScreen />
            </ScrollView>

            {/* FIXED FOOTER */}
            <View style={styles.filterFooter}>
              <TouchableOpacity style={styles.resetBtn}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setFilterVisible(false)}
              >
                <Text style={styles.applyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ================= MAIN ================= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={{ padding: 16 }}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push("/(tabs)/Admindashboard")}
              >
                <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Alerts Management</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="notifications-outline" size={24} color="#FF5757" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileIcon}
                onPress={() => setProfileModalVisible(true)}
              >
                <Text style={styles.profileInitial}>{adminInitial}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SEARCH */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search user..."
              style={styles.searchInput}
            />
            <TouchableOpacity onPress={() => setFilterVisible(true)}>
              <Ionicons name="filter-outline" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* LIVE ALERTS */}
          <Text style={styles.sectionTitle}>Live Alert Feed</Text>

          {liveAlerts.length === 0 ? (
            <Text style={{ textAlign: "center", marginTop: 20, color: "#999" }}>
              No live alerts in the last hour.
            </Text>
          ) : (
            liveAlerts.map((item) => (
              <View key={item.id} style={styles.alertCard}>
                {renderIcon(item)}
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>
                    {item.title || item.type}
                  </Text>
                  <Text style={styles.alertTime}>
                    {formatTimestamp(item.timestamp)}
                  </Text>
                  <Text style={styles.alertUser}>
                    User: {getUserDisplay(item)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB for History */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setHistoryModalVisible(true)}
      >
        <Text style={styles.fabText}>Alert History</Text>
      </TouchableOpacity>


      {/* HISTORY MODAL */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alert History</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Alerts older than 1 hour</Text>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {alertHistory.length === 0 ? (
                <Text style={{ textAlign: "center", marginTop: 20, color: "#999" }}>
                  No history found.
                </Text>
              ) : (
                alertHistory.map((item) => (
                  <View key={item.id} style={styles.historyCard}>
                    {renderIcon(item)}
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>
                        {item.title || item.type}
                      </Text>
                      <Text style={styles.alertTime}>
                        {formatTimestamp(item.timestamp)}
                      </Text>
                      <Text style={styles.alertUser}>
                        User: {getUserDisplay(item)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Admin Profile Modal */}
      <AdminProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </SafeAreaView >
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 20,
    paddingBottom: 8,
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
    gap: 12,
    alignItems: "center"
  },

  iconBtn: {
    width: 40,
    height: 40,
    backgroundColor: "transparent",
    borderRadius: 20,
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
  profileInitial: { color: "#D32F2F", fontWeight: "bold", fontSize: 20 },

  searchBar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  searchInput: { flex: 1 },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
  },


  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12, // Reduced radius slightly
    padding: 12, // Reduced padding
    marginBottom: 8, // Reduced margin
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12, // Reduced padding
    marginBottom: 8, // Reduced margin
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  alertContent: {
    flex: 1,
    marginLeft: 12, // Reduced margin
    justifyContent: "center",
  },
  alertTitle: {
    fontSize: 14, // Smaller title
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 12, // Smaller time
    color: "#6B7280",
    marginBottom: 0,
    fontWeight: "500",
  },
  alertUser: {
    fontSize: 11, // Smaller user text
    color: "#9CA3AF",
    marginTop: 2,
  },

  iconCircle: {
    width: 42, // Smaller icon circle
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#DC2626",
  },

  /* ===== FILTER ===== */

  filterOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  filterBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  filterPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    height: "75%",
  },

  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterTitle: { fontSize: 18, fontWeight: "700" },

  filterFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    gap: 12,
  },

  resetBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  resetText: { fontWeight: "700", color: "#374151" },

  applyBtn: {
    flex: 2,
    backgroundColor: "#FF5757",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyText: { color: "#FFF", fontWeight: "700", fontSize: 16 },

  /* ===== FAB ===== */
  /* ===== FAB ===== */
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    backgroundColor: '#FF5757', // Theme Red
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30, // Pill shape
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: "#FF5757",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    zIndex: 1000,
  },
  fabText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  /* ===== HISTORY MODAL ===== */
  modalOverlay: {
    position: "absolute",
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  modalContainer: {
    width: "90%",
    height: "80%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
});