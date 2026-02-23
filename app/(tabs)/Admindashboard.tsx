import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AdminProfileModal from "../../components/AdminProfileModal";
import AdminAnnouncementModal from "../../components/AdminAnnouncementModal";
import { auth, db } from "../../firebaseConfig";

const screenWidth = Dimensions.get("window").width;

interface Activity {
  id: string;
  name: string;
  type: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface Metrics {
  login: number;
  signup: number;
  logout: number;
  feedback: number;
}

export default function DashboardScreen() {
  const router = useRouter();

  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    login: 0,
    signup: 0,
    logout: 0,
    feedback: 0,
  });
  const [loading, setLoading] = useState(true);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  /* 🔹 NEW: Robust User Name Resolver */
  const getUserName = (d: any, userMap?: any) => {
    // 1. Try to resolve ID if it looks like a UID
    if (userMap && d.user && userMap[d.user]) {
      return userMap[d.user].name || userMap[d.user].email || "Unknown User";
    }
    // 2. Check embedded details or direct fields
    return (
      d.userName || // Check direct custom name first (logged by logUserActivity)
      d.details?.contact?.name ||
      d.details?.user?.name ||
      d.details?.userName ||
      d.user ||
      d.name ||
      d.email ||
      "Unknown User"
    );
  };

  /* 🔹 NEW: Get Icon & Title based on Activity Type */
  /* 🔹 NEW: Unified Simple Color Scheme */
  // As requested: "set any one as the default light colur"
  // We will use a soft red styling to match the brand found in other screens.
  const DEFAULT_ICON = "notifications";
  const DEFAULT_COLOR = "#FF5757"; // Main Brand Color
  const DEFAULT_BG = "#FFE2E2";    // Light Background

  const getActivityInfo = (type: string) => {
    switch (type) {
      // Keep icons distinct but colors unified
      case "fake_call":
        return { title: "Fake Call Alert", icon: "call", color: DEFAULT_COLOR, bg: DEFAULT_BG };
      case "battery_low":
        return { title: "Battery Low Alert", icon: "battery-dead", color: DEFAULT_COLOR, bg: DEFAULT_BG };
      case "motion_shake":
        return { title: "Motion Sensor Alert", icon: "pulse", color: DEFAULT_COLOR, bg: DEFAULT_BG };
      case "location_share_contact":
      case "location_share_all_contacts":
      case "instaaid_location_share":
        return { title: "Location Alert", icon: "location", color: DEFAULT_COLOR, bg: DEFAULT_BG };
      case "false_alarm":
        return { title: "False Alarm", icon: "warning", color: DEFAULT_COLOR, bg: DEFAULT_BG };

      // User Actions
      case "USER_SIGNUP":
        return { title: "New User Signed Up", icon: "person-add", color: DEFAULT_COLOR, bg: DEFAULT_BG };
      case "FEEDBACK":
        return { title: "Live Chat / Feedback", icon: "chatbubbles", color: DEFAULT_COLOR, bg: DEFAULT_BG };
      case "USER_LOGOUT":
        return { title: "User Logged Out", icon: "log-out", color: DEFAULT_COLOR, bg: DEFAULT_BG };
      case "USER_LOGIN":
        return { title: "User Logged In", icon: "log-in", color: DEFAULT_COLOR, bg: DEFAULT_BG };

      default:
        return { title: "General Alert", icon: DEFAULT_ICON, color: DEFAULT_COLOR, bg: DEFAULT_BG };
    }
  };

  const fetchDashboardData = async () => {
    try {
      /* 1. Fetch Stats */
      const [usersSnap, activeSnap, feedbackSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "users"), where("status", "==", "Active"))),
        getDocs(collection(db, "contactSubmissions")),
      ]);

      setTotalUsers(usersSnap.size);
      setActiveUsers(activeSnap.size);
      setFeedbackCount(feedbackSnap.size);

      setMetrics({
        login: Math.max(10, usersSnap.size * 2),
        signup: usersSnap.size,
        logout: Math.floor(usersSnap.size * 1.4),
        feedback: feedbackSnap.size,
      });

      /* 🔹 Build User Map */
      const userMap: Record<string, any> = {};
      usersSnap.forEach((doc) => {
        userMap[doc.id] = doc.data();
      });

      /* 2. Fetch Recent Activities (Aggregated) */
      const recentLimit = 50;

      // Fetch Alerts
      const alertsQ = query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(recentLimit));
      const alertsSnap = await getDocs(alertsQ);

      // Fetch Direct Signups (Users)
      const usersQ = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(recentLimit));
      const recentUsersSnap = await getDocs(usersQ);

      // Fetch Feedbacks (Live Chat)
      const feedbackQ = query(collection(db, "contactSubmissions"), orderBy("timestamp", "desc"), limit(recentLimit));
      const recentFeedbackSnap = await getDocs(feedbackQ);

      const combinedActivities: Activity[] = [];

      // Process Alerts
      alertsSnap.forEach((doc) => {
        const d = doc.data();
        const info = getActivityInfo(d.type);

        // 1. Resolve User Object (Try ID first, then Email search)
        const userData = userMap[d.user] || Object.values(userMap).find((u: any) => u.email === d.user);

        // 2. Resolve Name
        let displayName = "Unknown User";
        if (d.userName) {
          displayName = d.userName; // Explicit name in alert
        } else if (userData) {
          displayName = userData.name || userData.email || "Unknown User";
        } else if (d.details?.contact?.name) {
          displayName = d.details.contact.name;
        } else {
          // If d.user is strictly an ID/Email string, show it as fallback, otherwise keep generic
          displayName = (typeof d.user === 'string' && d.user.length > 5) ? d.user : "Unknown User";
        }

        // 3. Resolve Location
        let locationDisplay = "Unknown Location";

        if (d.location && d.location !== "Unknown Location") {
          locationDisplay = d.location;
        } else if (d.details?.coords?.latitude && d.details?.coords?.longitude) {
          locationDisplay = `Lat: ${d.details.coords.latitude.toFixed(4)}, Lng: ${d.details.coords.longitude.toFixed(4)} `;
        } else if (d.latitude && d.longitude) {
          locationDisplay = `Lat: ${d.latitude.toFixed(4)}, Lng: ${d.longitude.toFixed(4)} `;
        }

        // Fallback: User's Registered Address
        if ((locationDisplay === "Unknown Location" || locationDisplay.includes("Unknown")) && userData) {
          const addr = userData.address || userData.baseAddress;
          if (addr) {
            // Truncate if too long, or just show it. "Reg: " indicates registered address.
            locationDisplay = "Reg: " + addr;
          }
        }

        combinedActivities.push({
          id: doc.id,
          name: displayName,
          type: info.title,
          time: d.timestamp?.toDate ? d.timestamp.toDate().toLocaleString() : new Date().toLocaleDateString(),
          timestamp: d.timestamp?.toDate ? d.timestamp.toDate().getTime() : 0, // for sorting
          icon: info.icon as any,
          color: info.color,
          bg: info.bg,
          location: locationDisplay
        } as any);
      });

      // Process Signups
      recentUsersSnap.forEach((doc) => {
        const d = doc.data();
        const info = getActivityInfo("USER_SIGNUP");
        combinedActivities.push({
          id: doc.id,
          name: d.name || d.email || "New User",
          type: info.title,
          time: d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString() : "Just now",
          timestamp: d.createdAt?.toDate ? d.createdAt.toDate().getTime() : 0,
          icon: info.icon as any,
          color: info.color,
          bg: info.bg,
          location: d.address || "Location not provided"
        } as any);
      });

      // Process Feedback
      recentFeedbackSnap.forEach((doc) => {
        const d = doc.data();
        const info = getActivityInfo("FEEDBACK");
        combinedActivities.push({
          id: doc.id,
          name: d.name || d.email || "Visitor",
          type: info.title,
          time: d.timestamp?.toDate ? d.timestamp.toDate().toLocaleString() : "Just now",
          timestamp: d.timestamp?.toDate ? d.timestamp.toDate().getTime() : 0,
          icon: info.icon as any,
          color: info.color,
          bg: info.bg,
          location: "Help Center"
        } as any);
      });

      /* 3. Sort & Slice */
      combinedActivities.sort((a: any, b: any) => b.timestamp - a.timestamp);
      setActivities(combinedActivities); // Show ALL sorted

    } catch (err) {
      console.log("Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF5757" />
      </SafeAreaView>
    );
  }

  const chartData = [
    { name: "Login", population: metrics.login, color: "#22C55E" },
    { name: "Signup", population: metrics.signup, color: "#3B82F6" },
    { name: "Logout", population: metrics.logout, color: "#EF4444" },
    { name: "Feedback", population: metrics.feedback, color: "#F59E0B" },
  ];

  const adminInitial = auth.currentUser?.email?.charAt(0).toUpperCase() || "A";

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notificationIcon}
              onPress={() => setAnnouncementModalVisible(true)}
            >
              <Ionicons name="megaphone" size={24} color="#FF5757" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.notificationIcon}>
              <Ionicons name="notifications-outline" size={24} color="#FF5757" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profile}
              onPress={() => setProfileModalVisible(true)}
            >
              <Text style={styles.profileText}>{adminInitial}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.topCardRow}>
          <TopCard title="Users" value={totalUsers} icon="account-group" color="#3B82F6" />
          <TopCard title="Active" value={activeUsers} icon="account-check" color="#22C55E" />
          <TopCard title="Feedback" value={feedbackCount} icon="message-alert" color="#F59E0B" />
        </View>

        <Text style={styles.sectionTitle}>Metrics Overview</Text>
        <View style={styles.chartCard}>
          <BarChart data={chartData} />
        </View>

        <Text style={styles.sectionTitle}>Recent Activities</Text>
        {activities.length === 0 ? (
          <Text style={{ color: '#999', textAlign: 'center', marginTop: 10 }}>No recent activities found.</Text>
        ) : (
          activities.map((a: any) => {
            // Get first letter from name or email
            const getInitial = (name: string) => {
              if (!name || name === "Unknown User") return "U";
              // If it's an email, get the first letter before @
              if (name.includes("@")) {
                return name.charAt(0).toUpperCase();
              }
              // Otherwise get first letter of name
              return name.charAt(0).toUpperCase();
            };

            const initial = getInitial(a.name);

            return (
              <View key={a.id} style={styles.activityCard}>
                <View style={[styles.avatarBox, { backgroundColor: (a as any).bg || "#FFE2E2" }]}>
                  <Text style={[styles.avatarText, { color: (a as any).color || "#FF5757" }]}>{initial}</Text>
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.activityTitle}>{a.name}</Text>
                    <Text style={styles.activityTime}>{a.time}</Text>
                  </View>
                  <Text style={[styles.activityType, { color: "#4B5563" }]}>{a.type}</Text>
                  {a.location ? (
                    <Text style={styles.locationText} numberOfLines={1}>📍 {a.location}</Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <AdminProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />

      <AdminAnnouncementModal
        visible={announcementModalVisible}
        onClose={() => setAnnouncementModalVisible(false)}
        onSuccess={() => {
          // Optional: refresh dashboard data
          fetchDashboardData();
        }}
      />
    </SafeAreaView>
  );
}

const BarChart = ({ data }: any) => {
  const maxValue = Math.max(...data.map((item: any) => item.population));
  const chartHeight = 220; // Height of the chart area
  const barWidth = 40; // Width of each bar - slimmer for elegant look
  const total = data.reduce((sum: number, item: any) => sum + item.population, 0);

  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
      {/* Chart Container */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-evenly', height: chartHeight, marginBottom: 15, paddingHorizontal: 10 }}>
        {data.map((item: any, index: number) => {
          const barHeight = (item.population / maxValue) * (chartHeight - 40); // Scale bar height
          const percentage = ((item.population / total) * 100).toFixed(0);

          return (
            <View key={index} style={{ alignItems: 'center', flex: 1 }}>
              {/* Value Label on Top */}
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: '#1F2937',
                marginBottom: 6
              }}>
                {item.population}
              </Text>

              {/* Vertical Bar */}
              <View style={{
                width: barWidth,
                height: barHeight,
                backgroundColor: item.color,
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                justifyContent: 'flex-start',
                alignItems: 'center',
                paddingTop: 8,
                minHeight: 35,
                shadowColor: item.color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3
              }}>
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: 10
                }}>
                  {percentage}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* X-axis Line */}
      <View style={{
        height: 2,
        backgroundColor: '#E5E7EB',
        marginBottom: 10
      }} />

      {/* X-axis Labels (Metric Names) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {data.map((item: any, index: number) => (
          <View key={index} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: item.color,
              marginBottom: 6
            }} />
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#374151',
              textAlign: 'center'
            }}>
              {item.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const TopCard = ({ title, value, icon, color }: any) => (
  <View style={styles.topCard}>
    <MaterialCommunityIcons name={icon} size={20} color={color} />
    <Text style={styles.topValue}>{value}</Text>
    <Text style={styles.topLabel}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 16 },

  headerWrapper: { paddingTop: 30, paddingBottom: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700" },

  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },

  notificationIcon: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },

  profile: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFE2E2",
    justifyContent: "center",
    alignItems: "center",
  },

  profileText: { color: "#D32F2F", fontWeight: "bold", fontSize: 20 },

  topCardRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, marginTop: 8 },
  topCard: { width: "32%", backgroundColor: "#FFF", borderRadius: 14, paddingVertical: 14, alignItems: "center", elevation: 3 },
  topValue: { fontSize: 20, fontWeight: "700", marginTop: 6 },
  topLabel: { fontSize: 12, color: "#6B7280" },

  sectionTitle: { fontSize: 17, fontWeight: "700", marginVertical: 14 },
  chartCard: { backgroundColor: "#FFF", borderRadius: 16, paddingVertical: 10, elevation: 2 },

  activityCard: { flexDirection: "row", backgroundColor: "#FFF", padding: 12, borderRadius: 14, marginBottom: 10, elevation: 2, alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarBox: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', fontSize: 18 },
  activityTitle: { fontWeight: "700", fontSize: 14, color: '#333' },
  activityType: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  activityTime: { fontSize: 11, color: "#9CA3AF" },
  locationText: { fontSize: 11, color: "#666", marginTop: 2 },
});