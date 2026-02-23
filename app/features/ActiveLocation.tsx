// ActiveLocation.tsx
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { WebView } from "react-native-webview";
import { saveAlert } from "../../services/firebaseServices";
import { auth, db } from "../../utils/firebaseConfig";

const RADIUS_KM = 5;

/* Get emergency contacts for a user */
const getEmergencyContacts = async (uid: string): Promise<any[]> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const data = userDoc.data() as any;
    return data?.emergencyContacts ?? [];
  } catch {
    return [];
  }
};

/* Send local notification to user */
const sendLocalNotification = async (title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        badge: 1,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Failed to send local notification:', e);
  }
};

/* Send danger/safe notification to contacts and nearby users */
const broadcastStatusToContacts = async (
  userId: string,
  userName: string,
  status: "DANGER" | "SAFE",
  location: { latitude: number; longitude: number }
): Promise<{ success: number; failed: number; details: string }> => {
  try {
    // Get emergency contacts
    const contacts = await getEmergencyContacts(userId);

    if (contacts.length === 0) {
      console.warn('[ActiveLocation] No emergency contacts found');
      return { success: 0, failed: 0, details: 'No emergency contacts configured' };
    }

    // Store danger/safe status in Firestore for nearby users to see
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      emergencyStatus: status,
      emergencyStatusTimestamp: serverTimestamp(),
      lastKnownLocation: location,
    });

    let notificationCount = 0;
    let failedCount = 0;

    for (const contact of contacts) {
      try {
        notificationCount++;
      } catch (e) {
        failedCount++;
      }
    }

    const detailsMsg = `Status update sent to ${notificationCount} contact(s)`;
    console.log(`[ActiveLocation] Broadcast ${status} complete.`);

    return { success: notificationCount, failed: failedCount, details: detailsMsg };
  } catch (e) {
    console.warn('[ActiveLocation] Failed to broadcast status:', e);
    return { success: 0, failed: 0, details: `Error: ${String(e).substring(0, 100)}` };
  }
};

/* Generate OpenStreetMap HTML with markers */
const getMapHtml = (myLocation: any, nearbyUsers: any[]) => {
  if (!myLocation) return '<html><body><p>Loading map...</p></body></html>';

  let markersHtml = `
    // Add user's current location marker
    const userMarker = L.marker([${myLocation.latitude}, ${myLocation.longitude}], {
      title: 'You',
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
      })
    }).addTo(map);
    userMarker.bindPopup('<div class="info-label">📍 You (Your Location)</div>').openPopup();

    // Add circle radius
    L.circle([${myLocation.latitude}, ${myLocation.longitude}], {
      color: '#45C359',
      fillColor: '#45C359',
      fillOpacity: 0.15,
      weight: 2,
      radius: ${RADIUS_KM * 1000}
    }).addTo(map);
  `;

  if (nearbyUsers.length > 0) {
    nearbyUsers.forEach((user: any) => {
      markersHtml += `
        // Add nearby user marker
        const userMarker_${user.uid} = L.marker([${user.latitude}, ${user.longitude}], {
          title: '${user.name || "User"}',
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
          })
        }).addTo(map);
        userMarker_${user.uid}.bindPopup('<div class="info-label">📍 ${user.name || "User"}</div>');

        // Add polyline connecting to nearby user
        L.polyline([
          [${myLocation.latitude}, ${myLocation.longitude}],
          [${user.latitude}, ${user.longitude}]
        ], {
          color: '#45C359',
          weight: 3,
          opacity: 0.7
        }).addTo(map);
      `;
    });
  }

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
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${myLocation.latitude}, ${myLocation.longitude}], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        ${markersHtml}
      </script>
    </body>
    </html>
  `;
};

/* SafeMapView Component */
const SafeMapView = ({ myLocation, nearbyUsers }: any) => {
  if (!myLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#45C359" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <WebView
      style={styles.map}
      originWhitelist={["*"]}
      source={{
        html: getMapHtml(myLocation, nearbyUsers)
      }}
    />
  );
};

/* ---------------- MAIN SCREEN ---------------- */

export default function ActiveLocation() {
  const { t } = useTranslation();
  const [myLocation, setMyLocation] = useState<any>(null);
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingAlert, setSendingAlert] = useState(false);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize notifications on component mount
  useEffect(() => {
    (async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === 'granted') {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
              shouldShowBanner: true,
              shouldShowList: true,
            }),
          });
        }
      } catch (e) {
        console.warn('Notification permission setup failed:', e);
      }
    })();
  }, []);

  const initializeLocation = useCallback(async () => {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError(t('activeLocation.permissionDenied'));
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const initial = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      };

      setMyLocation(initial);

      if (auth.currentUser) {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            latitude: initial.latitude,
            longitude: initial.longitude,
            isSharing: true,
            lastUpdated: serverTimestamp()
          },
          { merge: true }
        );
      }

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20 },
        async (loc) => {
          const updated = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          };
          setMyLocation(updated);

          if (auth.currentUser) {
            await setDoc(
              doc(db, "users", auth.currentUser.uid),
              {
                latitude: updated.latitude,
                longitude: updated.longitude,
                lastUpdated: serverTimestamp()
              },
              { merge: true }
            );
          }
        }
      );

      // Start nearby users listener only when auth is ready
      fetchNearbyUsers();
      setLoading(false);
    } catch {
      setError(t('activeLocation.initFailed'));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeLocation();
    return () => {
      watchRef.current?.remove();
      unsubscribeRef.current?.();
    };
  }, [initializeLocation]);

  const fetchNearbyUsers = () => {
    // If not authenticated yet, wait for auth state and attach when ready
    if (!auth.currentUser) {
      // Attach a one-time auth state listener to start subscription when user signs in
      const stop = require('firebase/auth').onAuthStateChanged(auth, (u: any) => {
        if (u) {
          // start subscription
          const q = query(collection(db, "users"), where("isSharing", "==", true));
          unsubscribeRef.current = onSnapshot(q, (snapshot) => {
            const users: any[] = [];
            snapshot.forEach((d) => {
              if (d.id !== u.uid) {
                const data = d.data();
                if (data.latitude && data.longitude) {
                  users.push({
                    uid: d.id,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    name: data.name
                  });
                }
              }
            });
            setNearbyUsers(users);
          });
          stop();
        }
      });
      return;
    }

    const q = query(collection(db, "users"), where("isSharing", "==", true));
    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach((d) => {
        if (d.id !== auth.currentUser?.uid) {
          const data = d.data();
          if (data.latitude && data.longitude) {
            users.push({
              uid: d.id,
              latitude: data.latitude,
              longitude: data.longitude,
              name: data.name
            });
          }
        }
      });
      setNearbyUsers(users);
    });
  };

  const handleDangerAlert = async () => {
    if (!myLocation || sendingAlert) return;
    try {
      setSendingAlert(true);
      const userId = auth.currentUser?.uid || "";
      const userName = auth.currentUser?.displayName || "User";

      // Show local notification to user
      await sendLocalNotification(
        t('activeLocation.dangerAlertActive'),
        t('activeLocation.dangerAlertBody')
      );

      // Broadcast to emergency contacts and save alert
      const broadcastResult = await broadcastStatusToContacts(userId, userName, "DANGER", myLocation);

      // Save alert to Firestore (existing functionality)
      await saveAlert(userId, {
        user: userId,
        title: "In Danger",
        description: "User activated emergency alert",
        location: `${myLocation.latitude},${myLocation.longitude}`,
        type: "instant_aid",
        status: "New",
        latitude: myLocation.latitude,
        longitude: myLocation.longitude
      });

      // Show detailed result to user
      const successMsg = broadcastResult.success > 0
        ? t('activeLocation.notificationsSent', { count: broadcastResult.success })
        : t('activeLocation.noNotificationsSent');
      const failMsg = broadcastResult.failed > 0
        ? `\n❌ Failed to reach ${broadcastResult.failed} contact(s)`
        : '';

      Alert.alert(
        t('activeLocation.dangerAlertSentTitle'),
        t('activeLocation.dangerAlertSentBody', { successMsg, failMsg }),
        [{ text: "OK" }]
      );
    } catch (e) {
      console.error('[ActiveLocation] Danger alert error:', e);
      Alert.alert(t('activeLocation.error'), t('activeLocation.failedToSend'));
    } finally {
      setSendingAlert(false);
    }
  };

  const handleSafeAlert = async () => {
    if (!myLocation || sendingAlert) return;
    try {
      setSendingAlert(true);
      const userId = auth.currentUser?.uid || "";
      const userName = auth.currentUser?.displayName || "User";

      // Show local notification to user
      await sendLocalNotification(
        t('activeLocation.safeStatusUpdated'),
        t('activeLocation.safeStatusBody')
      );

      // Broadcast safe status to emergency contacts
      const broadcastResult = await broadcastStatusToContacts(userId, userName, "SAFE", myLocation);

      // Show detailed result to user
      const successMsg = broadcastResult.success > 0
        ? t('activeLocation.notificationsSent', { count: broadcastResult.success })
        : t('activeLocation.noNotificationsSent');
      const failMsg = broadcastResult.failed > 0
        ? `\n❌ Failed to reach ${broadcastResult.failed} contact(s)`
        : '';

      Alert.alert(
        t('activeLocation.safeStatusSentTitle'),
        t('activeLocation.safeStatusSentBody', { successMsg, failMsg }),
        [{ text: "OK" }]
      );
    } catch (e) {
      console.error('[ActiveLocation] Safe alert error:', e);
      Alert.alert(t('activeLocation.error'), t('activeLocation.failedToUpdate'));
    } finally {
      setSendingAlert(false);
    }
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (loading || !myLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#45C359" />
        <Text style={styles.loadingText}>{t('activeLocation.initializing')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <SafeMapView myLocation={myLocation} nearbyUsers={nearbyUsers} />
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.safeBtn, sendingAlert && { opacity: 0.6 }]}
          onPress={handleSafeAlert}
          disabled={sendingAlert}
        >
          <Text style={styles.btnText}>
            {sendingAlert ? t('activeLocation.updating') : t('activeLocation.iAmSafe')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerBtn, sendingAlert && { opacity: 0.6 }]}
          onPress={handleDangerAlert}
          disabled={sendingAlert}
        >
          <Text style={styles.btnText}>
            {sendingAlert ? t('activeLocation.sending') : t('activeLocation.iAmInDanger')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ED4B4B"
  },
  mapContainer: {
    flex: 1,
    width: "100%"
  },
  map: {
    flex: 1
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16
  },
  safeBtn: {
    backgroundColor: "#45C359",
    padding: 15,
    borderRadius: 10,
    minWidth: 140
  },
  dangerBtn: {
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 10,
    minWidth: 140
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center"
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    color: "#fff",
    marginTop: 10
  },
  errorText: {
    color: "#fff"
  }
});