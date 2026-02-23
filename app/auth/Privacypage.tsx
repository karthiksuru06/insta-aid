import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PrivacyScreen() {
  const router = useRouter();

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      router.replace("/Login");
    } catch (e) {
      // If storage fails, still proceed but log
      console.warn("Failed to set onboarding flag", e);
      router.replace("/Login");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Privacy, Our Priority</Text>
      <Text style={styles.subtitle}>
        We are committed to protecting your data and ensuring your safety.
      </Text>

      {/* Top Icon */}
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark" size={60} color="#F56565" />
      </View>

      {/* Info Boxes with Icons */}
      <View style={styles.infoBox}>
        <Ionicons name="lock-closed" size={28} color="#F56565" style={styles.infoIcon} />
        <View style={styles.infoText}>
          <Text style={styles.infoTitle}>Secure Data Encryption</Text>
          <Text style={styles.infoDesc}>
            All your personal information and emergency contacts are protected with industry-leading encryption standards.
          </Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <MaterialIcons name="privacy-tip" size={28} color="#F56565" style={styles.infoIcon} />
        <View style={styles.infoText}>
          <Text style={styles.infoTitle}>You Control Your Data</Text>
          <Text style={styles.infoDesc}>
            Manage your preferences easily. Decide what information is shared and when, with full transparency.
          </Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <FontAwesome5 name="ban" size={26} color="#F56565" style={styles.infoIcon} />
        <View style={styles.infoText}>
          <Text style={styles.infoTitle}>No Third-Party Sharing</Text>
          <Text style={styles.infoDesc}>
            Your safety data is strictly for emergency use and never shared or sold to external parties.
          </Text>
        </View>
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted} >
        <Text style={styles.getStartedText}>Get started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF2F2", padding: 24 },
  title: { fontSize: 22, fontWeight: "bold", marginTop: 40, textAlign: "center", color: "#18181B" },
  subtitle: { fontSize: 15, textAlign: "center", marginVertical: 10, color: "#52525B" },
  iconContainer: { alignItems: "center", marginVertical: 18 },
  infoBox: { 
    flexDirection: "row", 
    alignItems: "flex-start", 
    backgroundColor: "#fff", 
    padding: 16, 
    borderRadius: 8, 
    marginVertical: 8 
  },
  infoIcon: { marginRight: 12, marginTop: 3 },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: "bold", color: "#F56565", marginBottom: 6 },
  infoDesc: { fontSize: 13, color: "#313139" },
  getStartedButton: { backgroundColor: "#F56565", paddingVertical: 14, borderRadius: 8, marginTop: 28, alignItems: "center" },
  getStartedText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" }
});
