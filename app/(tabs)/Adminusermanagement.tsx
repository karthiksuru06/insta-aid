import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from "react-native-webview";
import AdminProfileModal from "../../components/AdminProfileModal";
import { auth } from "../../firebaseConfig";
import {
  addUser as addUserService,
  deleteUser,
  migrateUserStatuses,
  saveUserData,
  subscribeToUsers
} from "../../services/firebaseServices";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  address?: string;
  role: string;
  status: "Active" | "Inactive";
  emergencyContacts?: { name: string; phone: string }[];
}

export default function UserManagementScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapLocation, setMapLocation] = useState({
    latitude: 17.385044,
    longitude: 78.486671,
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    gender: "",
    address: "",
    status: "Inactive" as "Active" | "Inactive",
    emergencyContacts: [] as { name: string; phone: string }[],
  });

  // ✅ Real-time User Listener (attach only after auth ready)
  useEffect(() => {
    let unsubscribeUsers: (() => void) | null = null;
    const stop = onAuthStateChanged(auth, async (user) => {
      if (user && !unsubscribeUsers) {
        // Run migration on first load
        try {
          await migrateUserStatuses([]);
        } catch (e) {
          console.error("Migration error:", e);
        }

        unsubscribeUsers = subscribeToUsers((data) => {
          console.log(`👥 [USER MANAGEMENT] Raw data from Firestore:`, data.map(u => ({ id: u.id, email: u.email, status: u.status })));
          const safeData = data.map((u: User) => ({
            ...u,
            email: u.email || "",
            name: u.name || "Unknown",
            role: u.role || "User",
            status: (u.status === "Active" ? "Active" : "Inactive") as "Active" | "Inactive",
            emergencyContacts: u.emergencyContacts || [],
          }));
          console.log(`👥 [USER MANAGEMENT] Processed data with status:`, safeData.map(u => ({ id: u.id, email: u.email, status: u.status })));
          setUsers(safeData);
          setFilteredUsers(safeData);
        });
      }
    });

    return () => {
      stop();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, []);

  // Update filtered users when search text usually remains
  // Note: Simple filtering implementation just resets on data update
  // Ideally, apply current search filter to new data



  const handleDelete = (userId: string) => {
    Alert.alert("Delete User", "Are you sure? This will delete the user from the app.", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteUser(userId);
            setMenuUserId(null);
            Alert.alert("Success", "User has been deleted successfully");
            // Auto-updated via subscription
          } catch (error: any) {
            Alert.alert("Error", `Failed to delete user: ${error.message}`);
            console.error("Delete user error:", error);
          }
        },
      },
    ]);
  };

  const handleSearch = (text: string) => {
    const filtered = users.filter((u) =>
      u.name.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  /* Generate OpenStreetMap HTML */
  const getMapHtml = (lat: number, lng: number) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
        <style>
          * { margin: 0; padding: 0; }
          body { height: 100vh; }
          #map { width: 100%; height: 100%; }
          .info-label {
            background: #fff;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            color: #333;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${lat}, ${lng}], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          let selectedMarker = L.marker([${lat}, ${lng}], {
            title: 'Selected Location'
          }).addTo(map);
          selectedMarker.bindPopup('<div class="info-label">📍 Location Marker</div>').openPopup();

          // Click to select location
          map.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            if (selectedMarker) {
              map.removeLayer(selectedMarker);
            }
            
            selectedMarker = L.marker([lat, lng], {
              title: 'Selected Location'
            }).addTo(map);
            selectedMarker.bindPopup('<div class="info-label">📍 Selected Location</div>').openPopup();
            
            // Send location data back to React Native
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'location-selected',
              latitude: lat,
              longitude: lng
            }));
          });
        </script>
      </body>
      </html>
    `;
  };

  const openAddUserModal = (user?: User) => {
    if (user) {
      setNewUser({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        gender: user.gender || "",
        address: user.address || "",
        status: user.status,
        emergencyContacts: user.emergencyContacts || [],
      });
    } else {
      setNewUser({
        id: "",
        name: "",
        email: "",
        phone: "",
        gender: "",
        address: "",
        status: "Inactive",
        emergencyContacts: [],
      });
    }
    setMenuUserId(null);
    setModalVisible(true);
  };

  const handleAddOrEditUser = async () => {
    if (!newUser.name || !newUser.email) {
      Alert.alert("Error", "Name and Email are required");
      return;
    }
    if (newUser.id) {
      await saveUserData(newUser.id, newUser);
    } else {
      const payload = {
        ...newUser,
        id: newUser.id || Date.now().toString(),
      };
      await addUserService(payload as any);
    }
    setModalVisible(false);
    // Auto-updated via subscription
  };

  const openEmergencyModal = (user: User) => {
    setSelectedUser(user);
    setMenuUserId(null);
    setEmergencyModalVisible(true);
  };

  const renderUser = ({ item, index }: { item: User; index: number }) => {
    const avatarLetter = item.email
      ? item.email[0].toUpperCase()
      : item.name
        ? item.name[0].toUpperCase()
        : "?";

    const isMenuOpen = menuUserId === item.id;
    const isLastItem = index === filteredUsers.length - 1;

    return (
      <View style={[styles.cardWrapper, { zIndex: isMenuOpen ? 1000 : 1 }]}>
        <View
          style={[
            styles.card,
            isMenuOpen && styles.cardSelected,
          ]}
        >
          <View style={styles.emailAvatar}>
            <Text style={styles.emailAvatarText}>{avatarLetter}</Text>
          </View>

          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.role}>{item.role}</Text>
          </View>

          {/* Status Badge - moved to right side */}
          <View
            style={[
              styles.statusBadge,
              item.status === "Active" ? styles.active : styles.inactive,
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>

          {/* Three-dot menu */}
          <View style={{ marginLeft: 6 }}>
            <TouchableOpacity
              style={{ padding: 6 }}
              onPress={() =>
                setMenuUserId(isMenuOpen ? null : item.id)
              }
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={22}
                color={isMenuOpen ? "#FF5757" : "#666"}
              />
            </TouchableOpacity>

            {isMenuOpen && (
              <View
                style={[
                  styles.sideMenu,
                  isLastItem && { bottom: 0, top: "auto" },
                ]}
              >
                <TouchableOpacity
                  style={{ paddingVertical: 10 }}
                  onPress={() => openAddUserModal(item)}
                >
                  <Text style={styles.menuItem}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ paddingVertical: 10 }}
                  onPress={() => openEmergencyModal(item)}
                >
                  <Text style={styles.menuItem}>Emergency Contacts</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ paddingVertical: 10 }}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={[styles.menuItem, { color: "#FF5757" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const adminEmail = auth.currentUser?.email || "";
  const adminInitial = adminEmail ? adminEmail.charAt(0).toUpperCase() : "U";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
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

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#9CA3AF"
          style={{ marginLeft: 10 }}
        />
        <TextInput
          placeholder="Search Users..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          onChangeText={handleSearch}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={{ paddingBottom: 100 }}
        removeClippedSubviews={false}
        onScrollBeginDrag={() => setMenuUserId(null)}
      />

      {/* FAB - Floating Action Button for Add User */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => openAddUserModal()}
      >
        <Ionicons name="person-add" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* MODALS REMAIN UNCHANGED BELOW... (keeping them in the file structure effectively) */}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {newUser.id ? "Edit User" : "Add New User"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={newUser.name}
                onChangeText={(text) =>
                  setNewUser({ ...newUser, name: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={newUser.email}
                keyboardType="email-address"
                onChangeText={(text) =>
                  setNewUser({ ...newUser, email: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={newUser.phone}
                keyboardType="phone-pad"
                onChangeText={(text) =>
                  setNewUser({ ...newUser, phone: text })
                }
              />

              <View style={styles.genderContainer}>
                {["Male", "Female", "Prefer not to say"].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderButton,
                      newUser.gender === g && styles.genderSelected,
                    ]}
                    onPress={() => setNewUser({ ...newUser, gender: g })}
                  >
                    <Text
                      style={{
                        color: newUser.gender === g ? "#fff" : "#4B5563",
                        fontWeight: "600",
                        fontSize: 13,
                        textAlign: 'center',
                      }}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Base Address"
                value={newUser.address}
                onChangeText={(text) =>
                  setNewUser({ ...newUser, address: text })
                }
              />

              <TouchableOpacity
                style={styles.mapButton}
                onPress={async () => {
                  const { status } =
                    await Location.requestForegroundPermissionsAsync();
                  if (status !== "granted") {
                    Alert.alert("Permission denied");
                    return;
                  }
                  const loc = await Location.getCurrentPositionAsync({});
                  setMapLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                  });
                  setMapVisible(true);
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Pick From Map</Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.mapButton, { flex: 1, marginBottom: 0 }]}
                  onPress={handleAddOrEditUser}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.mapButton,
                    { backgroundColor: "#9CA3AF", flex: 1, marginBottom: 0 },
                  ]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EMERGENCY CONTACTS MODAL */}
      <Modal visible={emergencyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Emergency Contacts</Text>
            <ScrollView>
              {(selectedUser?.emergencyContacts ?? []).length ? (
                (selectedUser?.emergencyContacts ?? []).map((c, idx) => (
                  <View key={idx} style={{ marginBottom: 10 }}>
                    <Text style={{ fontWeight: "600" }}>{c.name}</Text>
                    <Text>{c.phone}</Text>
                  </View>
                ))
              ) : (
                <Text>No emergency contacts found</Text>
              )}
              <TouchableOpacity
                style={[styles.mapButton, { marginTop: 10 }]}
                onPress={() => setEmergencyModalVisible(false)}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MAP MODAL */}
      <Modal visible={mapVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          <WebView
            style={{ flex: 1 }}
            originWhitelist={["*"]}
            source={{
              html: getMapHtml(mapLocation.latitude, mapLocation.longitude)
            }}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === "location-selected") {
                  setMapLocation({
                    latitude: data.latitude,
                    longitude: data.longitude
                  });
                }
              } catch (e) {
                console.log("Error parsing message:", e);
              }
            }}
          />
          <TouchableOpacity
            style={[styles.mapButton, { margin: 16 }]}
            onPress={async () => {
              const geo = await Location.reverseGeocodeAsync({
                latitude: mapLocation.latitude,
                longitude: mapLocation.longitude,
              });
              const g = geo[0];
              const addressText = g
                ? `${g.name || ""} ${g.street || ""}, ${g.city || ""} ${g.region || ""
                  } ${g.postalCode || ""}`.trim()
                : `Lat: ${mapLocation.latitude.toFixed(
                  6
                )}, Lng: ${mapLocation.longitude.toFixed(6)}`;

              setNewUser({
                ...newUser,
                address: addressText,
              });
              setMapVisible(false);
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <AdminProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // Header
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50, // More spacious
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24, // Larger title
    fontWeight: "700",
    color: "#1A1A1A",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  notificationIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  profileIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFE2E2", // Restored background
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    color: "#D32F2F",
    fontWeight: "bold",
    fontSize: 18,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6', // Very subtle border
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#333', paddingVertical: 0 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF5757', // Theme Red
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: "#FF5757", // Colored shadow
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    zIndex: 1000,
  },

  // List Cards
  cardWrapper: { marginHorizontal: 20, marginBottom: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10, // Reduced padding for smaller boxes
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardSelected: {
    borderColor: "#FF5757",
    backgroundColor: "#FFF5F5",
  },
  emailAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFE2E2", // Matched with Header Profile Icon Background
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emailAvatarText: {
    color: "#D32F2F", // Matched with Header Profile Initial Color
    fontWeight: "700",
    fontSize: 18
  },
  name: { fontSize: 15, fontWeight: "700", color: '#111', marginBottom: 2 }, // Reduced font
  role: { fontSize: 12, color: "#9CA3AF" }, // Reduced font
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 4,
  },
  active: { backgroundColor: "#7fe87fff" },
  inactive: { backgroundColor: "#fb6a6aff" },
  statusText: { fontSize: 11, fontWeight: "600", color: '#333' },

  sideMenu: {
    position: "absolute",
    top: 32,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 180, // Slightly wider for new layout
    elevation: 20,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  menuItem: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333'
  },

  // Modals... (keeping rest of modal styles)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "left",
    color: "#111",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: "#F9FAFB",
    color: "#111",
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  genderButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    paddingVertical: 0,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
  },
  genderSelected: {
    backgroundColor: "#FF5757",
    borderColor: "#FF5757",
  },
  mapButton: {
    backgroundColor: "#FF5757",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#FF5757",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 8,
    gap: 12,
  },
});