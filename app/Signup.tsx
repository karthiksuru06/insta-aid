import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Firebase
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// Location & Maps
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";

export default function Signup() {
  const router = useRouter();
  const { t } = useTranslation();

  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Location states
  const [baseAddress, setBaseAddress] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [tempLocation, setTempLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapVisible, setMapVisible] = useState(false);

  /* ---------------- LOCATION HELPERS ---------------- */

  const getReadableAddress = async (latitude: number, longitude: number) => {
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo.length > 0) {
        const { name, city, region, country } = geo[0];
        return `${name ?? ""}, ${city ?? ""}, ${region ?? ""}, ${country ?? ""}`;
      }
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.log("Geocoding error:", error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t('permissionRequiredTitle'),
          t('permissionRequiredMessage'),
          [
            { text: t('openSettings'), onPress: () => Linking.openSettings() },
            { text: t('cancel'), style: "cancel" },
          ]
        );
        return;
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          t('locationServicesDisabledTitle'),
          t('locationServicesDisabledMessage')
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };

      const address = await getReadableAddress(coords.latitude, coords.longitude);

      setLocation(coords);
      setBaseAddress(address);
      setTempLocation(null);
      setMapVisible(false);

      await AsyncStorage.setItem("baseLocation", JSON.stringify(coords));
      Alert.alert(t('locationSuccessTitle'), t('locationSuccessMessage'));
    } catch (error: any) {
      console.log("Location error:", error);
      Alert.alert(t('locationErrorTitle'), error.message || t('errorFetchingLocation'));
    }
  };

  const handleConfirmMapSelection = async () => {
    if (!tempLocation) {
      Alert.alert(t('error'), t('selectLocationMapError'));
      return;
    }

    try {
      const address = await getReadableAddress(tempLocation.latitude, tempLocation.longitude);
      setLocation(tempLocation);
      setBaseAddress(address);
      setMapVisible(false);
      setTempLocation(null);

      await AsyncStorage.setItem("baseLocation", JSON.stringify(tempLocation));
      Alert.alert(t('success'), t('locationSuccessMessage'));
    } catch {
      Alert.alert(t('error'), t('failedToSetLocation'));
    }
  };

  /* Generate OpenStreetMap HTML */
  const getMapHtml = (lat: number, lng: number, selectedLocation: any) => {
    const selectedLat = selectedLocation?.latitude || lat;
    const selectedLng = selectedLocation?.longitude || lng;

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
            title: '${t('currentLocationMarker')}'
          }).addTo(map);
          currentMarker.bindPopup('<div class="info-label">📍 ${t('currentLocationMarker')}</div>');

          // Selected location marker
          let selectedMarker = null;
          if (${selectedLat} !== ${lat} || ${selectedLng} !== ${lng}) {
            selectedMarker = L.marker([${selectedLat}, ${selectedLng}], {
              title: '${t('selectedLocationMarker')}',
              icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
              })
            }).addTo(map);
            selectedMarker.bindPopup('<div class="info-label">📍 ${t('selectedLocationMarker')}</div>');
          }

          // Click to select location
          map.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            if (selectedMarker) {
              map.removeLayer(selectedMarker);
            }
            
            selectedMarker = L.marker([lat, lng], {
              title: '${t('selectedLocationMarker')}',
              icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
              })
            }).addTo(map);
            selectedMarker.bindPopup('<div class="info-label">📍 ${t('selectedLocationMarker')}</div>').openPopup();
            
            // Send location data back to React Native
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'location-selected',
              latitude: lat,
              longitude: lng
            }));
          });
        </script>
      </body>
      </html>
    `;
  };

  // Handle Android back button when map is open
  useEffect(() => {
    const backAction = () => {
      if (mapVisible) {
        setMapVisible(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [mapVisible]);

  /* ---------------- SIGNUP ---------------- */

  const handleSignup = async () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      Alert.alert(t('error'), t('fillAllFieldsError'));
      return;
    }

    if (!location) {
      Alert.alert(t('error'), t('selectLocationAlert'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('error'), t('passwordsDoNotMatch'));
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert(t('error'), "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;
      await updateProfile(user, { displayName: fullName });

      console.log(`👤 [SIGNUP] Creating user document for ${user.uid} (${email})`);
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: fullName,
        email,
        phone,
        baseAddress,
        location,
        role: "User",
        status: "Inactive", // Set to Inactive until they log in
        createdAt: serverTimestamp(),
      });
      console.log(`✅ [SIGNUP] User document created successfully`);

      Alert.alert(t('success'), t('accountCreated'));
      router.replace("/Login");
    } catch (error: any) {
      Alert.alert(t('signupFailed'), error.message);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <FontAwesome name="mobile" size={28} color="#fff" />
          </View>
          <Text style={styles.appName}>InstaAID</Text>
        </View>

        <Text style={styles.title}>{t('createAccount')}</Text>
        <Text style={styles.subtitle}>
          {t('signupSubtitle')}
        </Text>

        {/* Inputs */}
        <Text style={styles.label}>{t('fullNameLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('fullNamePlaceholder')}
          placeholderTextColor="#999"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>{t('emailAddressLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('emailAddressPlaceholder')}
          placeholderTextColor="#999"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>{t('phoneNumberLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('phoneNumberPlaceholder')}
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        {/* Location */}
        <Text style={styles.label}>{t('baseAddressLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('selectLocationPlaceholder')}
          placeholderTextColor="#999"
          value={baseAddress}
          editable={false}
        />
        <TouchableOpacity
          style={[styles.button, { marginTop: 10 }]}
          onPress={() => setMapVisible(true)}
        >
          <FontAwesome name="map-marker" size={16} color="#fff" />
          <Text style={[styles.buttonText, { marginLeft: 8 }]}>{t('selectLocationXButton')}</Text>
        </TouchableOpacity>

        {/* Map View */}
        {mapVisible && (
          <View style={styles.mapContainer}>
            <WebView
              style={{ flex: 1 }}
              originWhitelist={["*"]}
              source={{
                html: getMapHtml(location?.latitude || 17.385, location?.longitude || 78.4867, tempLocation)
              }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type === "location-selected") {
                    setTempLocation({
                      latitude: data.latitude,
                      longitude: data.longitude
                    });
                  }
                } catch (e) {
                  console.log("Error parsing message:", e);
                }
              }}
            />

            <View style={styles.mapButtonsContainer}>
              <TouchableOpacity
                style={[styles.button, styles.mapButton]}
                onPress={getCurrentLocation}
              >
                <Text style={styles.buttonText}>{t('useCurrentButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.mapButton]}
                onPress={handleConfirmMapSelection}
              >
                <Text style={styles.buttonText}>{t('confirmButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Password */}
        <Text style={styles.label}>{t('passwordLabel')}</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('createPasswordPlaceholder')}
            placeholderTextColor="#999"
            secureTextEntry={secure}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setSecure(!secure)} style={styles.eyeIcon}>
            <FontAwesome name={secure ? "eye-slash" : "eye"} size={18} color="#666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('confirmPasswordLabel')}</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('confirmPasswordPlaceholder')}
            placeholderTextColor="#999"
            secureTextEntry={secureConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)} style={styles.eyeIcon}>
            <FontAwesome name={secureConfirm ? "eye-slash" : "eye"} size={18} color="#666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>{t('createAccountButton')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/Login")}>
          <Text style={styles.loginText}>
            {t('alreadyHaveAccount')} <Text style={styles.loginLink}>{t('logInLink')}</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 80, paddingBottom: 80 },
  logoContainer: { alignItems: "center", marginBottom: 20 },
  logoCircle: {
    backgroundColor: "#ff4848",
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  appName: { fontSize: 20, fontWeight: "700", color: "#222" },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "600", color: "#333", marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    color: "#222",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  passwordInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: "#222" },
  eyeIcon: { padding: 8 },
  button: {
    backgroundColor: "#ff4848",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  mapButton: { flex: 1, marginHorizontal: 5 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  mapContainer: {
    width: "100%",
    height: 300,
    marginTop: 15,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  mapButtonsContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#f5f5f5",
  },
  loginText: { textAlign: "center", marginTop: 15, color: "#888", fontSize: 14 },
  loginLink: { color: "#ff4848", fontWeight: "700" },
});
