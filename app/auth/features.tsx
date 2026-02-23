import { Entypo, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SafetyFeatures() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Scrollable Content */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.heading}>Extra Safety Features</Text>
        <Text style={styles.description}>
          Beyond core alerts, InstaAid offers additional tools to enhance your personal
          security and provide peace of mind in various situations.
        </Text>

        {/* Illustration */}
        <Image
          source={require("../../assets/images/features.jpg")}
          style={styles.illustration}
        />

        {/* Features List */}
        <View style={styles.feature}>
          <Ionicons
            name="notifications-off-circle"
            size={28}
            color="#F56565"
            style={styles.icon}
          />
          <View style={styles.textBlock}>
            <Text style={styles.featureTitle}>Silent Alerts</Text>
            <Text style={styles.featureDesc}>
              Discreetly notify your emergency contacts without making a sound, ensuring
              your safety without drawing attention.
            </Text>
          </View>
        </View>

        <View style={styles.feature}>
          <MaterialCommunityIcons
            name="phone"
            size={28}
            color="#F56565"
            style={styles.icon}
          />
          <View style={styles.textBlock}>
            <Text style={styles.featureTitle}>Fake Calls</Text>
            <Text style={styles.featureDesc}>
              Generate a simulated incoming call to provide a quick and believable excuse
              to leave uncomfortable or unsafe situations.
            </Text>
          </View>
        </View>

        <View style={styles.feature}>
          <Entypo name="location-pin" size={28} color="#F56565" style={styles.icon} />
          <View style={styles.textBlock}>
            <Text style={styles.featureTitle}>Location Sharing</Text>
            <Text style={styles.featureDesc}>
              Continuously share your live location with your trusted emergency contacts,
              so they always know where you are in an emergency.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Next Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => router.push("/auth/Privacypage")}
        >
          <Text style={styles.nextText}>Next ➝</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  content: {
    marginTop: 25,
    padding: 20,
    paddingBottom: 40, // give space above footer
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#111827",
  },
  description: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 20,
  },
  illustration: {
    width: "100%",
    height: 180,
    resizeMode: "contain",
    marginBottom: 20,
  },
  feature: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  icon: {
    marginRight: 12,
    marginTop: 3,
  },
  textBlock: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#111827",
  },
  featureDesc: {
    fontSize: 14,
    color: "#4B5563",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  nextButton: {
    backgroundColor: "#F56565",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});