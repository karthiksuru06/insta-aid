import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminProfileModal from "../../components/AdminProfileModal";
import { auth, db } from "../../firebaseConfig";
import { withAdminGuard } from "../../components/withAdminGuard";

/* ================= TYPES ================= */

type ItemType = "number" | "website";

type EmergencyItem = {
  id: string;
  name: string;
  value: string;
  category: string;
  icon: string;
  type: ItemType;
};

/* ================= MAPS ================= */

const CATEGORY_ICON_MAP: Record<string, string> = {
  "Police & Safety": "shield-outline",
  "Medical & Fire": "medical-outline",
  "Disaster & Crisis": "alert-circle-outline",
  "Support Hotlines": "call-outline",
  "Websites": "globe-outline"
};

const categories = Object.keys(CATEGORY_ICON_MAP);

/* ================= COMPONENT ================= */

function EmergencyScreen() {
  const [items, setItems] = useState<EmergencyItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const [type, setType] = useState<ItemType>("number");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("Police & Safety");

  const router = useRouter();

  const numbersRef = collection(db, "emergency_numbers");
  const websitesRef = collection(db, "emergency_websites");

  /* -------- FETCH ALL -------- */
  const fetchAll = async () => {
    const numbersSnap = await getDocs(numbersRef);
    const websitesSnap = await getDocs(websitesRef);

    const numbers = numbersSnap.docs.map(d => ({
      id: d.id,
      type: "number" as ItemType,
      value: d.data().number,
      ...(d.data() as any)
    }));

    const websites = websitesSnap.docs.map(d => ({
      id: d.id,
      type: "website" as ItemType,
      value: d.data().url,
      ...(d.data() as any)
    }));

    setItems([...numbers, ...websites]);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  /* -------- ADD -------- */
  const addItem = async () => {
    if (!name.trim() || !value.trim()) return;

    if (type === "number") {
      await addDoc(numbersRef, {
        name,
        number: value,
        category,
        icon: CATEGORY_ICON_MAP[category]
      });
    } else {
      await addDoc(websitesRef, {
        name,
        url: value,
        category: "Websites",
        icon: "globe-outline"
      });
    }

    setName("");
    setValue("");
    setCategory("Police & Safety");
    setType("number");
    setModalVisible(false);
    fetchAll();
  };

  /* -------- DELETE -------- */
  const deleteItem = async (item: EmergencyItem) => {
    const ref =
      item.type === "number"
        ? doc(db, "emergency_numbers", item.id)
        : doc(db, "emergency_websites", item.id);

    await deleteDoc(ref);
    fetchAll();
  };

  /* -------- GET ICON -------- */
  const getIconForService = (item: EmergencyItem): string => {
    const nameLower = item.name.toLowerCase();

    // Specific service name mappings
    if (nameLower.includes('ambulance')) return 'medkit-outline';
    if (nameLower.includes('women') && nameLower.includes('helpline')) return 'call-outline';
    if (nameLower.includes('police')) return 'shield-outline';
    if (nameLower.includes('fire')) return 'flame-outline';
    if (nameLower.includes('disaster')) return 'alert-circle-outline';

    // Fallback to category icon or default
    return item.icon || 'help-circle-outline';
  };

  const renderItem = ({ item }: { item: EmergencyItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        if (item.type === "website") Linking.openURL(item.value);
      }}
    >
      <View style={styles.cardLeft}>
        <View style={styles.iconBox}>
          <Ionicons
            name={getIconForService(item) as any}
            size={24}
            color="#FF6B6B"
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.category}>{item.category}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => deleteItem(item)}
      >
        <Ionicons name="trash-outline" size={22} color="#FF0000" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const adminEmail = auth.currentUser?.email || "";
  const adminInitial = adminEmail ? adminEmail.charAt(0).toUpperCase() : "U";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(tabs)/Admindashboard")}
          >
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency Services</Text>
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

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* ================= MODAL ================= */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Emergency</Text>

            <View style={styles.typeRow}>
              {["number", "website"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, type === t && styles.typeActive]}
                  onPress={() => setType(t as ItemType)}
                >
                  <Text
                    style={
                      type === t ? styles.typeTextActive : styles.typeText
                    }
                  >
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Service Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              placeholder={
                type === "number" ? "Emergency Number" : "Website URL"
              }
              keyboardType={type === "number" ? "phone-pad" : "url"}
              value={value}
              onChangeText={setValue}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />

            {type === "number" && (
              <>
                <Text style={styles.categoryTitle}>Category</Text>
                {categories.filter(c => c !== "Websites").map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryBtn,
                      category === cat && styles.categoryActive
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={
                        category === cat
                          ? styles.categoryTextActive
                          : styles.categoryText
                      }
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={addItem}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <AdminProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff", padding: 16 },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
    marginBottom: 16
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: 24
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center"
  },
  profileIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFE2E2",
    justifyContent: "center",
    alignItems: "center"
  },
  profileInitial: {
    color: "#D32F2F",
    fontWeight: "bold",
    fontSize: 20
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 1000, // Ensure FAB is on top
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 10
  },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconBox: {
    width: 50,
    height: 50,
    backgroundColor: "#FFF1F1",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  cardContent: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600" },
  value: { fontSize: 14, color: "#666" },
  category: { fontSize: 12, color: "#999" },
  deleteBtn: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  modalBox: {
    width: "90%",
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
    marginBottom: 20,
    textAlign: "left",
    color: "#111",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#F3F4F6", // Softer border
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 15,
    color: "#111",
  },

  // Segmented Control
  typeRow: {
    flexDirection: "row",
    marginBottom: 24,
    backgroundColor: "#F3F4F6",
    padding: 4,
    borderRadius: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  typeActive: {
    backgroundColor: "#FF6B6B",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 13,
  },
  typeTextActive: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  // Category
  categoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 4,
    color: "#333",
  },
  categoryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    backgroundColor: "#F9FAFB",
    marginBottom: 8,
    alignItems: "center",
  },
  categoryActive: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  categoryText: {
    color: "#4B5563",
    fontWeight: "600",
    fontSize: 14,
  },
  categoryTextActive: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // Action Buttons
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#FF6B6B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#9CA3AF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default withAdminGuard(EmergencyScreen);
