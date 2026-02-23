// ActiveLocation.tsx
import * as Location from "expo-location";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View
} from "react-native";
import { WebView } from 'react-native-webview'; // Use Leaflet in a WebView (matches Locationpage)
import ErrorBoundary from '../../components/ErrorBoundaryModal';
import { useTheme } from '../../components/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { auth, db } from "../../utils/firebaseConfig";

const { width } = Dimensions.get("window");
const RADAR_SIZE = width - 40;
const RADIUS_KM = 5;





/* ---------------- MAIN SCREEN ---------------- */

export default function ActiveLocation() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { startDangerNotifications, stopDangerNotifications, sendSafeNotification, isDangerMode } = useNotifications();
  const [showSafeBanner, setShowSafeBanner] = useState(false);

  const [myLocation, setMyLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingAlert, setSendingAlert] = useState(false);
  // map lifecycle is handled within the WebView (Leaflet).

  const fetchNearbyUsers = useCallback(() => {
    const q = query(collection(db, "users"), where("isSharing", "==", true));
    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach((d) => {
        if (d.id !== auth.currentUser?.uid) {
          const data = d.data();
          if (data.latitude != null && data.longitude != null) {
            users.push({
              uid: d.id,
              latitude: data.latitude,
              longitude: data.longitude,
              name: data.name,
            });
          }
        }
      });

      // Store base users (no dist). Distances are computed when myLocation changes.
      setNearbyUsers(users);
    });
  }, []);

  const initializeLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permission to access location was denied");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const updated = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setMyLocation(updated);

      if (auth.currentUser) {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            latitude: updated.latitude,
            longitude: updated.longitude,
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        );
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
        },
        async (loc) => {
          const updated = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          console.log('Location update', updated);
          setMyLocation(updated);

          if (auth.currentUser) {
            await setDoc(
              doc(db, "users", auth.currentUser.uid),
              {
                latitude: updated.latitude,
                longitude: updated.longitude,
                lastUpdated: serverTimestamp(),
              },
              { merge: true }
            );
          }
        }
      );

      // Start listening to nearby users
      fetchNearbyUsers();
    } catch (e) {
      console.warn('initializeLocation failed', e);
      setError("Failed to initialize location");
    } finally {
      setLoading(false);
    }
  }, [fetchNearbyUsers]);

  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // Earth radius km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Generate map HTML using Leaflet to render OSM tiles and markers (same approach as Locationpage)
  const getMapHtml = (lat: number, lng: number, users: any[]) => {
    const usersData = JSON.stringify(users.map(u => ({ lat: u.latitude, lng: u.longitude, name: u.name })));
    const radiusMeters = RADIUS_KM * 1000;

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
          .info-label { background: #fff; padding: 6px 8px; border-radius: 6px; font-size: 12px; color: #333; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          const currentMarker = L.circle([${lat}, ${lng}], { radius: ${radiusMeters}, color: '#45C359', fillColor: 'rgba(69,195,89,0.15)' }).addTo(map);
          const me = L.marker([${lat}, ${lng}], { title: '${t('activeLocation.youMarker', 'You')}' }).addTo(map);
          me.bindPopup('<div class="info-label">📍 ${t('activeLocation.youMarker', 'You')}</div>');

          const users = ${usersData};
          try {
            users.forEach(u => {
              const m = L.marker([u.lat, u.lng]).addTo(map);
              m.bindPopup('<div class="info-label">' + (u.name || '${t('activeLocation.unknownUser', 'Unknown')}') + '</div>');
              L.polyline([[${lat}, ${lng}], [u.lat, u.lng]], { color: '#45C359', weight: 3 }).addTo(map);
            });
          } catch (e) { console.warn('users render failed', e); }

          // ensure center stays on user
          map.setView([${lat}, ${lng}], 13);
        </script>
      </body>
      </html>
    `;
  };




  useEffect(() => {
    initializeLocation();
    return () => {
      watchRef.current?.remove();
      unsubscribeRef.current?.();
    };
  }, [initializeLocation]);

  // Recompute distances whenever our location updates
  useEffect(() => {
    if (!myLocation) return;

    // Update distances using functional state update to avoid introducing nearbyUsers as a dependency
    setNearbyUsers((prev) =>
      prev.map((u) => {
        if (typeof u.latitude === 'number' && typeof u.longitude === 'number') {
          return { ...u, dist: haversineKm(myLocation.latitude, myLocation.longitude, u.latitude, u.longitude) };
        }
        return { ...u, dist: undefined };
      })
    );
  }, [myLocation]);

  // Vibration logic for DANGER state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDangerMode) {
      // Vibrate repeatedly
      const vibratePattern = () => {
        Vibration.vibrate(500); // Vibrate for 500ms
      };

      vibratePattern(); // Initial vibrate
      interval = setInterval(vibratePattern, 2000); // Repeat every 2 seconds
    } else {
      Vibration.cancel();
    }

    return () => {
      clearInterval(interval);
      Vibration.cancel();
    };
  }, [isDangerMode]);



  /* 🔥 I AM IN DANGER */
  const setDanger = async () => {
    const me = auth.currentUser;
    if (!me) return;

    setSendingAlert(true);

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setMyLocation(coords);

      // Start global danger notifications
      try {
        startDangerNotifications();
      } catch (e) {
        console.warn('Failed to start danger notifications:', e);
      }

      await setDoc(
        doc(db, "users", me.uid),
        {
          uid: me.uid,
          name: me.displayName || "User",
          status: "danger",
          latitude: coords.latitude,
          longitude: coords.longitude,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('setDanger failed:', e);
    } finally {
      setSendingAlert(false);
    }
  };

  /* 🟢 I AM SAFE */
  const setSafe = async () => {
    const me = auth.currentUser;
    if (!me) return;



    // Stop global danger notifications and send a safe confirmation
    try {
      stopDangerNotifications();
      sendSafeNotification();
      setShowSafeBanner(true);
      setTimeout(() => setShowSafeBanner(false), 5000); // Hide after 5 seconds
    } catch (e) {
      console.warn('Failed to stop danger notifications / send safe notification:', e);
    }

    await setDoc(
      doc(db, "users", me.uid),
      {
        status: "safe",
        latitude: null,
        longitude: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#000' : '#fff' }]}>
      {/* 🚨 DANGER BANNER */}
      {isDangerMode && (
        <View style={styles.dangerBanner}>
          <Text style={styles.bannerText}>🚨 {t('activeLocation.dangerAlertActive', 'YOU ARE IN DANGER')}</Text>
        </View>
      )}

      {/* ✅ SAFE BANNER */}
      {!isDangerMode && showSafeBanner && (
        <View style={styles.safeBanner}>
          <Text style={styles.bannerText}>✅ {t('activeLocation.safeStatusUpdated', 'YOU ARE SAFE')}</Text>
        </View>
      )}

      <View style={[styles.radarWrapper, { backgroundColor: theme === 'dark' ? '#000' : '#ED4B4B', borderColor: theme === 'dark' ? '#fff' : '#fff' }]}>
        {myLocation ? (
          <View style={styles.mapWrapper}>
            <ErrorBoundary>
              <WebView
                style={styles.map}
                originWhitelist={["*"]}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                mixedContentMode="always"
                source={{ html: getMapHtml(myLocation.latitude, myLocation.longitude, nearbyUsers) }}
              />
            </ErrorBoundary>

            {/* Debug overlay */}
            {myLocation && (
              <View style={styles.debugBox} pointerEvents="none">
                <Text style={styles.debugText}>Lat: {myLocation.latitude.toFixed(5)}  Lng: {myLocation.longitude.toFixed(5)}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={[styles.emptyText, { color: '#fff', marginTop: 10 }]}>
              {t('activeLocation.gettingLocation', 'Getting your location...')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [
            styles.safeBtn,
            {
              backgroundColor: pressed ? "#45C359" : "#fff",
              borderColor: "#45C359",
              borderWidth: 1.5,
              opacity: 1
            }
          ]}
          onPress={setSafe}
        >
          {({ pressed }) => (
            <Text style={[styles.btnText, { color: pressed ? "#fff" : "#45C359" }]}>
              {t('activeLocation.iAmSafe', 'I AM SAFE')}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.dangerBtn,
            {
              backgroundColor: pressed ? "#ED4B4B" : "#fff",
              borderColor: "#ED4B4B",
              borderWidth: 1.5,
              opacity: 1
            }
          ]}
          onPress={setDanger}
        >
          {({ pressed }) => (
            <Text style={[styles.btnText, { color: pressed ? "#fff" : "#ED4B4B" }]}>
              {t('activeLocation.iAmInDanger', 'I AM IN DANGER')}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/* 🎨 Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ED4B4B",
    alignItems: "center",
    justifyContent: "center",
  },

  // circular map container
  radarWrapper: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden", // clip map into circle [web:43][web:51]
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ED4B4B",
  },

  mapWrapper: {
    width: '100%',
    height: '100%',
  },
  map: {
    width: "100%",
    height: "100%",
  },

  emptyText: {
    color: "#fff",
    fontSize: 16,
  },

  // custom marker bubble
  userMarker: {
    flexDirection: "row",
    alignItems: "center",
  },
  userInitialCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  userInitial: {
    color: "#fff",
    fontWeight: "bold",
  },
  userLabel: {
    backgroundColor: "#000",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 4,
  },
  userName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  userDistance: {
    color: "#fff",
    fontSize: 11,
  },

  debugBox: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
  },

  /* fallback centered indicator when map tiles can't load */
  fallbackCenter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    alignItems: 'center',
  },
  fallbackDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#45C359',
    borderWidth: 2,
    borderColor: '#fff',
  },
  fallbackText: {
    marginTop: 8,
    color: '#fff',
    fontSize: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },

  buttons: {
    marginTop: 40,
    flexDirection: "row",
    gap: 15,
    width: "100%",
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  safeBtn: {
    flex: 1,
    backgroundColor: "#45C359",
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBtn: {
    flex: 1,
    backgroundColor: "#000",
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 14,
  },

  dangerBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    zIndex: 999,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  safeBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    zIndex: 999,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#45C359',
  },
  bannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
});
