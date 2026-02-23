import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import * as SMS from "expo-sms";
import React, { useEffect, useState } from "react";
import { Alert, TextInput, View } from "react-native";
import {
  Button,
  Dialog,
  Provider as PaperProvider,
  Portal,
  Text,
} from "react-native-paper";

export default function HomeScreen() {
  // ✅ Explicitly typed state
  const [contacts, setContacts] = useState<string[]>([]);
  const [input, setInput] = useState<string>("");
  const [shakeCount, setShakeCount] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);

  // Request location permissions + set up accelerometer
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location access is required.");
      }
    })();

    Accelerometer.setUpdateInterval(300);

    const subscription = Accelerometer.addListener((data) => {
      const totalForce =
        Math.abs(data.x) + Math.abs(data.y) + Math.abs(data.z);
      if (totalForce > 1.2) {
        setShakeCount((prev) => prev + 1);
      }
    });

    const interval = setInterval(() => setShakeCount(0), 5000);

    return () => {
      subscription && subscription.remove();
      clearInterval(interval);
    };
  }, []);

  // Show confirmation dialog after 3 shakes
  useEffect(() => {
    if (shakeCount >= 3 && contacts.length > 0) {
      setVisible(true);
      setShakeCount(0);
    }
  }, [shakeCount, contacts]);

  // Send SMS with location
  const sendLocationSMS = async (): Promise<void> => {
    try {
      const { coords } = await Location.getCurrentPositionAsync({});
      const message = `I need help! My location: https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        await SMS.sendSMSAsync(contacts, message);
        Alert.alert("Message sent", "Your location has been shared.");
      } else {
        Alert.alert("Error", "SMS service not available.");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to get location or send SMS.");
    }
  };

  // Add a contact to the list
  const addContact = (): void => {
    if (input.trim() !== "") {
      setContacts((prev) => [...prev, input.trim()]);
      setInput("");
    }
  };

  return (
    <PaperProvider>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>
          InstaAid App
        </Text>

        <Text>Enter contacts to notify:</Text>

        <TextInput
          style={{
            height: 40,
            borderColor: "gray",
            borderWidth: 1,
            marginVertical: 10,
            paddingHorizontal: 10,
            width: "80%",
          }}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          value={input}
          onChangeText={setInput}
        />

        <Button mode="contained" onPress={addContact}>
          Add Contact
        </Button>

        <Text style={{ marginTop: 10 }}>Saved Contacts:</Text>
        {contacts.map((c, i) => (
          <Text key={i}>{c}</Text>
        ))}

        <Text style={{ marginTop: 20 }}>
          Shake your phone 3 times to send location.
        </Text>

        <Portal>
          <Dialog visible={visible} onDismiss={() => setVisible(false)}>
            <Dialog.Title>Confirm</Dialog.Title>
            <Dialog.Content>
              <Text>Do you want to share your location via SMS?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setVisible(false)}>Cancel</Button>
              <Button
                onPress={() => {
                  setVisible(false);
                  sendLocationSMS();
                }}
              >
                Yes
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </PaperProvider>
  );
}