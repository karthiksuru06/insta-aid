import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SecondOnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/second.jpg')}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.header}>Shake Detection SOS</Text>
        <Text style={styles.description}>
          Simply shake your phone vigorously
          to instantly trigger an SOS alert.
          Your predefined emergency contacts
          will be notified without unlocking the screen.
        </Text>
        <View style={styles.stepsRow}>
          <View style={styles.iconSection}>
            <Image
              source={require('../../assets/images/handshake.jpg')}
              style={styles.icon}
            />
            <Text style={styles.iconLabel}>Shake{"\n"}Phone</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={styles.iconSection}>
            <Image
              source={require('../../assets/images/calllogo.jpg')}
              style={styles.icon}
            />
            <Text style={styles.iconLabel}>Trigger{"\n"}Alarm</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={styles.iconSection}>
            <Image
              source={require('../../assets/images/notification.jpg')}
              style={styles.icon}
            />
            <Text style={styles.iconLabel}>Silent{"\n"}Alert</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/auth/features')}
        >
          <Text style={styles.buttonText}>Next ➔</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

export const options = {
  headerShown: false,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 27,
    paddingTop: 40,
    justifyContent: "flex-start",
  },
  image: {
    width: 250,
    height: 250,
    marginBottom: 25,
    borderRadius: 16,
  },
  header: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: "#3B3B3B",
    marginBottom: 30,
    lineHeight: 25,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  iconSection: {
    alignItems: "center",
  },
  arrow: {
    fontSize: 32,
    marginHorizontal: 14,
    color: "#F56565",
    fontWeight: "bold",
  },
  icon: {
    width: 38,
    height: 38,
    marginBottom: 6,
  },
  iconLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#535353",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#FF4E4E",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 55,
    width: "85%",
    alignSelf: "center",
    position: "absolute",
    bottom: 28,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
  },
});