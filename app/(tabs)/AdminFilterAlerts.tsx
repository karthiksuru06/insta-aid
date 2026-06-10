import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function AdminFilterAlertsScreen({ onClose }: { onClose?: () => void }): React.ReactElement {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [loading, setLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDateObj, setStartDateObj] = useState(new Date());
  const [endDateObj, setEndDateObj] = useState(new Date());
  const router = useRouter();

  // Handle Start Date - Use Text Input with Date Formatting
  const handleStartDatePress = () => {
    setShowStartDatePicker(true);
  };

  // Handle End Date - Use Text Input with Date Formatting
  const handleEndDatePress = () => {
    setShowEndDatePicker(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Select Date (YYYY-MM-DD)";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Validate date format
  const isValidDate = (dateString: string) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      
      console.log("🔹 [FILTER SCREEN] Filter inputs:", {
        startDate,
        endDate,
        location,
        status,
        severity,
      });

      // Validate at least one filter is selected
      if (!startDate && !endDate && !location && !status && !severity) {
        console.warn("⚠️  [FILTER SCREEN] No filters selected");
        Alert.alert("Info", "Please select at least one filter");
        setLoading(false);
        return;
      }

      // Query Firestore directly (replaces non-existent backend route)
      console.log("📤 [FILTER SCREEN] Querying Firestore directly...");
      let q = query(collection(db, "alerts"), orderBy("timestamp", "desc"));

      // Apply date range filter at the query level if both dates provided
      if (startDate && isValidDate(startDate)) {
        q = query(q, where("timestamp", ">=", Timestamp.fromDate(new Date(startDate))));
      }
      if (endDate && isValidDate(endDate)) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        q = query(q, where("timestamp", "<=", Timestamp.fromDate(endOfDay)));
      }

      const snapshot = await getDocs(q);
      let alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Apply remaining filters client-side
      if (status) {
        alerts = alerts.filter((a: any) => a.status === status);
      }
      if (severity) {
        alerts = alerts.filter((a: any) => a.severity === severity);
      }
      if (location) {
        const lowerLoc = location.toLowerCase();
        alerts = alerts.filter((a: any) => {
          const alertLoc = typeof a.location === 'string' ? a.location : JSON.stringify(a.location || '');
          return alertLoc.toLowerCase().includes(lowerLoc);
        });
      }

      console.log("✅ [FILTER SCREEN] Filter successful. Results count:", alerts.length);
      router.replace({
        pathname: "/(tabs)/AdminAlertsManagement",
        params: { filteredAlerts: JSON.stringify(alerts) },
      });
    } catch (err) {
      console.error("❌ [FILTER SCREEN] Unexpected error:", err);
      Alert.alert("Error", "Failed to apply filters. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.header}>Filter Alerts</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <Text style={{ fontSize: 18, color: "#FF6B6B" }}>Close</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Date Range */}
        <Text style={styles.label}>Date Range</Text>
        <View style={styles.dateRangeContainer}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={handleStartDatePress}
            >
              <Text style={styles.dateButtonText}>📅 {formatDate(startDate)}</Text>
            </TouchableOpacity>
            <Text style={styles.dateHint}>Format: YYYY-MM-DD</Text>
          </View>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={handleEndDatePress}
            >
              <Text style={styles.dateButtonText}>📅 {formatDate(endDate)}</Text>
            </TouchableOpacity>
            <Text style={styles.dateHint}>Format: YYYY-MM-DD</Text>
          </View>
        </View>

        {/* Start Date Input Modal */}
        <Modal visible={showStartDatePicker} transparent animationType="slide">
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Text style={styles.datePickerButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Start Date</Text>
                <TouchableOpacity 
                  onPress={() => {
                    if (startDate && isValidDate(startDate)) {
                      setShowStartDatePicker(false);
                    } else {
                      Alert.alert("Invalid Date", "Please enter date in YYYY-MM-DD format");
                    }
                  }}
                >
                  <Text style={[styles.datePickerButton, { color: "#FF6B6B" }]}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.dateInputModal}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                value={startDate}
                onChangeText={setStartDate}
              />
              
              <Text style={styles.dateExample}>Example: 2025-01-29</Text>
            </View>
          </View>
        </Modal>

        {/* End Date Input Modal */}
        <Modal visible={showEndDatePicker} transparent animationType="slide">
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Text style={styles.datePickerButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>End Date</Text>
                <TouchableOpacity 
                  onPress={() => {
                    if (endDate && isValidDate(endDate)) {
                      setShowEndDatePicker(false);
                    } else {
                      Alert.alert("Invalid Date", "Please enter date in YYYY-MM-DD format");
                    }
                  }}
                >
                  <Text style={[styles.datePickerButton, { color: "#FF6B6B" }]}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.dateInputModal}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                value={endDate}
                onChangeText={setEndDate}
              />
              
              <Text style={styles.dateExample}>Example: 2025-01-29</Text>
            </View>
          </View>
        </Modal>

        {/* Location */}
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="E.g., Central Park"
          placeholderTextColor="#999"
          value={location}
          onChangeText={setLocation}
        />

        {/* Status */}
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusContainer}>
          {["New", "Acknowledged", "Resolved"].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusButton, status === s && styles.statusButtonActive]}
              onPress={() => setStatus(status === s ? "" : s)}
            >
              <Text style={[styles.statusButtonText, status === s && styles.statusButtonTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Severity */}
        <Text style={styles.label}>Severity</Text>
        <View style={styles.severityContainer}>
          {["Low", "Medium", "High", "Critical"].map((sev) => (
            <TouchableOpacity
              key={sev}
              style={[styles.severityButton, severity === sev && styles.severityButtonActive]}
              onPress={() => setSeverity(severity === sev ? "" : sev)}
            >
              <Text style={[styles.severityButtonText, severity === sev && styles.severityButtonTextActive]}>
                {sev}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Apply Button */}
        <TouchableOpacity 
          style={[styles.applyButton, loading && styles.applyButtonDisabled]} 
          onPress={handleApplyFilters}
          disabled={loading}
        >
          <Text style={styles.applyButtonText}>
            {loading ? "Processing..." : "Apply Filters"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
    marginTop: 16,
  },
  dateRangeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  dateButton: {
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 25,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dateButtonText: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  dateHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
    marginLeft: 12,
  },
  datePickerModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  datePickerContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  datePickerButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateInputModal: {
    marginHorizontal: 20,
    marginTop: 20,
    height: 50,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  dateExample: {
    fontSize: 13,
    color: "#999",
    marginHorizontal: 20,
    marginTop: 12,
    fontStyle: "italic",
  },
  input: {
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 15,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  statusContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  statusButtonActive: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  statusButtonTextActive: {
    color: "#FFF",
  },
  severityContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  severityButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  severityButtonActive: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  severityButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  severityButtonTextActive: {
    color: "#FFF",
  },
  applyButton: {
    backgroundColor: "#FF6B6B",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  applyButtonDisabled: {
    backgroundColor: "#CCC",
    shadowOpacity: 0,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});