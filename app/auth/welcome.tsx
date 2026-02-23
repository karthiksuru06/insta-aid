import { useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Image
            source={require('../../assets/images/first.jpg')}
            style={styles.image}
            resizeMode="contain"
          />
          <Text style={styles.header}>Welcome to InstaAid</Text>
          <Text style={styles.description}>
            Your personal safety companion, designed to provide immediate assistance and peace of mind when you need it most.
            InstaAid empowers you with essential tools to enhance your personal security
            and connect with your trusted contacts in emergencies.
          </Text>
        </ScrollView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/auth/second")}
          >
            <Text style={styles.buttonText}>Next ➔</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export const options = {
  headerShown: false,
  tabBarStyle: { display: "none" },
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 5,
  },
  image: {
    width: 250,
    height: 250,
    marginBottom: 15,
  },
  header: {
  fontSize: 24,        // good for headings
  fontWeight: "bold",
  marginBottom: 20,
  textAlign: "center",
},
description: {
  fontSize: 16,        // comfortable body text
  textAlign: "center",
  lineHeight: 25,      // 1.5x line height for readability
  color: "#212121",
},

  buttonContainer: {
    paddingBottom: 50, // Adjusted space to raise button a bit from bottom
  },
  button: {
    backgroundColor: "#FF4E4E",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 55,
    alignSelf: "center",
    width: "85%",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
  },
});