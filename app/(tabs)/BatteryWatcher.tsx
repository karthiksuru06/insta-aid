import * as Battery from "expo-battery";
import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
// Note: `expo-notifications` is dynamically imported at runtime to avoid
// automatic push token registration when running in Expo Go (which causes
// warnings/errors). Import on-demand instead of top-level.
import * as Location from "expo-location";
import * as SMS from "expo-sms";
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";


export interface Contact {
  name: string;
  phone: string;
}

interface Props {
  batteryLowAlert?: boolean;
  locationOffAlert?: boolean;
  simulateFivePercentDrop?: boolean;
  setLastLocation?: React.Dispatch<React.SetStateAction<string>>;
}

const BATTERY_THRESHOLD = 0.3; // 30%

const BatteryWatcher: React.FC<Props> = ({
  batteryLowAlert,
  locationOffAlert,
  simulateFivePercentDrop,
  setLastLocation,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [smsSent, setSmsSent] = useState(false);
  const lastBatteryLevel = useRef<number | null>(null);
  const batteryLowDetectedTimeRef = useRef<number | null>(null); // Track when battery first dropped to 30%
  const lastLocationNotificationRef = useRef<number>(0); // Track last location off notification time

  // -------------------- Load Firebase Contacts --------------------
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setContacts(data.emergencyContacts ?? []);
      } else {
        setContacts([]);
      }
    });
    return () => unsub();
  }, []);

  // -------------------- Request Permissions --------------------
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // Avoid running notification token registration / dev-only behaviors in Expo Go
        if (Constants.appOwnership !== 'expo') {
          const Notifications = await import('expo-notifications');
          const { status: notifStatus } = await Notifications.requestPermissionsAsync();
          if (notifStatus !== 'granted') {
            Alert.alert('Permission required', 'Enable notification permission for alerts.');
          }

          // Set handler for foreground notifications
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
              shouldShowBanner: true,
              shouldShowList: true,
            }),
          });
        } else {
          console.log('Expo Go detected - skipping push token registration and advanced notification behaviors');
        }

        const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
        if (locStatus !== 'granted') {
          Alert.alert('Permission required', 'Enable location permission for alerts.');
        }
      } catch (e) {
        console.warn('Permission request failed', e);
      }
    };
    requestPermissions();
  }, []);

  // -------------------- Send Emergency SMS --------------------
  const sendEmergencySMS = async (batteryLevel: number, location: string) => {
    if (!contacts || contacts.length === 0) return;

    const contactPhones = contacts
      .map((c) => c.phone)
      .filter((phone) => typeof phone === "string" && phone.trim().length > 0);

    if (contactPhones.length === 0) {
      Alert.alert("No valid numbers", "Your saved contacts have no phone numbers.");
      return;
    }

    const message = `⚠ Battery is low (${Math.round(
      batteryLevel * 100
    )}%). Last known location: ${location}`;

    try {
      try {
        const BackgroundShake = require('../../modules/background-shake').default;
        const { PermissionsAndroid, Platform } = require('react-native');

        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.SEND_SMS
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn("SMS permission denied for battery alert");
            return;
          }
        }

        await BackgroundShake.sendSMS(contactPhones.join(','), message);
        setSmsSent(true);
        console.log("Silent Emergency SMS sent to:", contactPhones);
      } catch (e) {
        console.warn("Silent battery SMS failed, falling back", e);
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
          await SMS.sendSMSAsync(contactPhones, message);
          setSmsSent(true);
        } else {
          Alert.alert("SMS not available", "SMS is not supported on this device.");
        }
      }

      // Log battery low alert to Firestore and notifications
      const user = auth.currentUser;
      if (user) {
        try {
          await addDoc(collection(db, "alerts"), {
            userId: user.uid,
            type: "battery_low",
            title: "Battery Low Warning",
            description: `Your device battery is at ${Math.round(batteryLevel * 100)}%. Emergency SMS sent to contacts.`,
            location: location,
            details: { batteryLevel, contactPhones, location },
            timestamp: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Failed to log alert', e);
        }
      }
    } catch (error) {
      console.log("Failed to send SMS:", error);
    }
  };

  // -------------------- Human-readable Location --------------------
  const getHumanReadableLocation = async (): Promise<string> => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const addressArr = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (addressArr.length > 0) {
        const addr = addressArr[0];
        const parts = [
          addr.streetNumber,
          addr.street,
          addr.subregion,
          addr.city,
          addr.region,
          addr.postalCode,
          addr.country,
        ].filter(Boolean);
        const readableAddress = parts.join(", ");
        return `${readableAddress || `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`}`;
      }

      return `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`;
    } catch (error) {
      console.log("Error getting location:", error);
      return "Location unavailable";
    }
  };

  // -------------------- Foreground Monitoring --------------------
  useEffect(() => {
    if (!batteryLowAlert && !locationOffAlert) return;

    const interval = setInterval(async () => {
      // -------------------- Battery Monitoring --------------------
      if (batteryLowAlert) {
        const level = await Battery.getBatteryLevelAsync();

        if (
          lastBatteryLevel.current === null ||
          (simulateFivePercentDrop && level <= lastBatteryLevel.current - 0.05)
        ) {
          lastBatteryLevel.current = level;

          if (level <= BATTERY_THRESHOLD) {
            // First time battery drops to 30% or below
            if (batteryLowDetectedTimeRef.current === null) {
              batteryLowDetectedTimeRef.current = Date.now();
              try {
                if (Constants.appOwnership !== 'expo') {
                  const Notifications = await import('expo-notifications');
                  await Notifications.scheduleNotificationAsync({
                    content: {
                      title: "Battery Low ⚠",
                      body: `Battery is ${Math.round(level * 100)}%`,
                    },
                    trigger: null,
                  });
                } else {
                  console.log('Skipping scheduled notification in Expo Go (development limitations)');
                }
              } catch (e) {
                console.warn('Failed to schedule notification', e);
              }
            }

            const locString = await getHumanReadableLocation();
            setLastLocation?.(locString);

            // Check if 15 minutes have passed since battery dropped to 30%
            const now = Date.now();
            const timeSinceLow = now - (batteryLowDetectedTimeRef.current || 0);
            if (timeSinceLow >= 15 * 60 * 1000 && !smsSent) {
              await sendEmergencySMS(level, locString);
            }
          } else {
            // Battery is above 30%, reset the detection time
            batteryLowDetectedTimeRef.current = null;
            setSmsSent(false);
          }
        }
      }

      // -------------------- Location Monitoring --------------------
      if (locationOffAlert) {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          const now = Date.now();
          // Only send notification if 15 minutes have passed since last notification
          if (now - lastLocationNotificationRef.current >= 15 * 60 * 1000) {
            try {
              if (Constants.appOwnership !== 'expo') {
                const Notifications = await import('expo-notifications');
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "Location Off ⚠",
                    body: "Please enable device location!",
                  },
                  trigger: null,
                });
              } else {
                console.log('Skipping scheduled notification in Expo Go (development limitations)');
              }
            } catch (e) {
              console.warn('Failed to schedule notification', e);
            }
            lastLocationNotificationRef.current = now;

            // Log location off alert to Firestore and notifications page
            const user = auth.currentUser;
            if (user) {
              try {
                await addDoc(collection(db, "alerts"), {
                  userId: user.uid,
                  type: "location_off",
                  title: "Location is Off",
                  description: "Your location services are disabled. Please enable location for safety features.",
                  timestamp: serverTimestamp(),
                });
              } catch (e) {
                console.warn('Failed to log location alert', e);
              }
            }
          }
        } else {
          const locString = await getHumanReadableLocation();
          setLastLocation?.(locString);
        }
      }
    }, 5000); // every 5 seconds

    return () => clearInterval(interval);
  }, [batteryLowAlert, locationOffAlert, simulateFivePercentDrop, contacts, smsSent]);

  return null;
};

export default BatteryWatcher;
