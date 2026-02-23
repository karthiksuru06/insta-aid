// npx expo install react-native-maps -- install it then run the app

import { Feather, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import ErrorBoundary from '../../components/ErrorBoundaryModal';
import { useTheme } from '../../components/ThemeContext';
import { auth, db } from '../../firebaseConfig'; // Adjust the import based on your project structure

export default function CurrentLocationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation(); // Destructure t here
  const isDark = theme === "dark";

  const [location, setLocation] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* Generate OpenStreetMap HTML */
  const getMapHtml = (lat: number, lng: number) => {
    const bgColor = isDark ? '#1a1a1a' : '#fff';
    const textColor = isDark ? '#fff' : '#333';
    const labelBg = isDark ? '#2a2a2a' : '#fff';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
        <style>
          * { margin: 0; padding: 0; }
          body { height: 100vh; background-color: ${bgColor}; }
          #map { width: 100%; height: 100%; }
          .info-label {
            background: ${labelBg};
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            color: ${textColor};
            border: 1px solid ${isDark ? '#444' : '#ddd'};
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${lat}, ${lng}], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          // Current location marker
          const currentMarker = L.marker([${lat}, ${lng}], {
            title: '${t('yourLocationMarkerTitle', 'Your Location')}'
          }).addTo(map);
          currentMarker.bindPopup('<div class="info-label">📍 ${t('yourCurrentLocationPopup', 'Your Current Location')}</div>').openPopup();
        </script>
      </body>
      </html>
    `;
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.LocationAccuracy.Highest });
        setLocation(loc);

        const geocoded = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocoded && geocoded.length > 0) {
          const g = geocoded[0];
          const parts = [g.name, g.street, g.city, g.region, g.postalCode, g.country].filter(Boolean);
          setAddress(parts.join(', '));
        }
      } catch {
        setErrorMsg('Failed to fetch location.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const shareLocationWithInstaAidUsers = async () => {
    try {
      if (!location) {
        Alert.alert('Error', 'Location not available. Please try again.');
        return;
      }

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
      };

      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated. Please log in.');
        return;
      }

      // Save location to Firebase Firestore
      const docRef = doc(db, 'locations', user.uid);
      await setDoc(docRef, locationData);

      // Navigate to ActiveLocation page
      router.push('/(tabs)/ActiveLocation');
    } catch (error) {
      console.error('Firebase Error:', error);
      Alert.alert('Error', 'Failed to share location. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: isDark ? "#111" : "#fff" }]}>
        <ActivityIndicator size="large" color="#ED4C4C" />
        <Text style={{ color: isDark ? "#fff" : "#333", marginTop: 10 }}>
          {t('activeLocation.gettingLocation', 'Fetching location...')}
        </Text>
      </SafeAreaView>
    );
  }

  if (errorMsg || !location) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>{errorMsg || 'Location unavailable'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isDark ? "#111" : "#fff" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#111" : "#fff"} />
      <View style={[styles.container, { backgroundColor: isDark ? "#111" : "#fff" }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={isDark ? "#fff" : "#333"} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#111", flex: 1, textAlign: "center" }]}>{t('yourCurrentLocation', 'Your Current Location')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Subtitle with navigation */}
        <TouchableOpacity onPress={() => router.push("/ActiveLocation")} activeOpacity={0.7}>
          <Text style={[styles.subtitle, { color: isDark ? "#aaa" : "#7a7a7a" }]}>
            {t('shareLocationSubtitle', 'Share instantly with contacts or InstaAid users.')}
          </Text>
        </TouchableOpacity>

        {/* Map */}
        <View style={styles.mapContainer}>
          <ErrorBoundary>
            <WebView
              style={styles.map}
              originWhitelist={["*"]}
              source={{
                html: getMapHtml(location.coords.latitude, location.coords.longitude)
              }}
            />
          </ErrorBoundary>
          <View style={styles.locationMeta}>
            <Text style={[styles.locationLabel, { color: isDark ? "#fff" : "#000" }]}>{address ?? t('unnamedPlace', 'Unnamed place')}</Text>
            <Text style={[styles.coords, { color: isDark ? "#aaa" : "#666" }]}>
              {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.8}
          onPress={shareLocationWithInstaAidUsers}
        >
          <Feather name="users" size={18} color="#fff" style={styles.iconLeft} />
          <Text style={styles.primaryButtonText}>{t('shareWithInstaAid', 'Share with Near InstaAid Users')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/ContactLocation' as any)}
        >
          <Feather name="phone" size={18} color="#ED4C4C" style={styles.iconLeft} />
          <Text style={styles.secondaryButtonText}>{t('shareWithContacts', 'Share with Emergency contacts')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingTop: 18, paddingHorizontal: 18, alignItems: 'center', backgroundColor: '#fff' },

  header: { width: '100%', flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 6 },
  backButton: { padding: 6, marginRight: 8, borderRadius: 6 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 13, color: '#7a7a7a', marginBottom: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },

  mapContainer: { width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eee', marginBottom: 26 },
  map: { flex: 1 },

  primaryButton: { width: '100%', backgroundColor: '#ED4C4C', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center', marginLeft: 10, flex: 1, flexWrap: 'wrap' },

  secondaryButton: { width: '100%', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.8, borderColor: '#ED4C4C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#f28b82', fontSize: 16, fontWeight: '600', marginLeft: 10, flex: 1, flexWrap: 'wrap', textAlign: 'center' },

  iconLeft: { marginRight: 6 },
  locationMeta: { paddingTop: 8 },
  locationLabel: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  coords: { color: '#666' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});