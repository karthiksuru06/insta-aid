// app/EditProfile.tsx
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { updateEmail, updateProfile } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { AvatarComponent } from "../../components/AvatarComponent";
import { useTheme } from "../../components/ThemeContext";
import { getUserData, saveUserData } from "../../services/firebaseServices";
import { generateEmailLetterAvatar } from "../../utils/avatarHelper";
import { auth } from "../../utils/firebaseConfig";

const { height } = Dimensions.get("window");
const AVATAR_SIZE = 76;
const HEADER_HEIGHT = height * 0.25;

export default function EditProfile() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [baseAddress, setBaseAddress] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [tempLocation, setTempLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const [profileImageUrl, setProfileImageUrl] = useState(generateEmailLetterAvatar("U"));

  const initialData = useRef({
    name: "",
    phone: "",
    email: "",
    gender: "",
    baseAddress: "",
  });

  // ----- Reverse geocoding -----
  const getReadableAddress = async (latitude: number, longitude: number) => {
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const { city, region, country, name } = geocode[0];
        return `${name ?? ""}, ${city ?? ""}, ${region ?? ""}, ${country ?? ""}`;
      }
      return `Lat: ${latitude}, Lon: ${longitude}`;
    } catch {
      return `Lat: ${latitude}, Lon: ${longitude}`;
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
            title: '${t('yourCurrentLocation')}'
          }).addTo(map);
          currentMarker.bindPopup('<div class="info-label">📍 ${t('yourCurrentLocation')}</div>');

          // Selected location marker
          let selectedMarker = null;
          if (${selectedLat} !== ${lat} || ${selectedLng} !== ${lng}) {
            selectedMarker = L.marker([${selectedLat}, ${selectedLng}], {
              title: '${t('selectedLocation') || 'Selected Location'}',
              icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
              })
            }).addTo(map);
            selectedMarker.bindPopup('<div class="info-label">📍 ${t('selectedLocation') || 'Selected Location'}</div>');
          }

          // Click to select location
          map.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            if (selectedMarker) {
              map.removeLayer(selectedMarker);
            }
            
            selectedMarker = L.marker([lat, lng], {
              title: '${t('selectedLocation') || 'Selected Location'}',
              icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
              })
            }).addTo(map);
            selectedMarker.bindPopup('<div class="info-label">📍 ${t('selectedLocation') || 'Selected Location'}</div>').openPopup();
            
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

  // ----- Confirm map selection -----
  const handleConfirmMapSelection = async () => {
    const finalLocation = tempLocation ?? location;
    if (!finalLocation) {
      Alert.alert(t('pleaseSelectLocationTitle') || t('selectLocationAlert'), t('pleaseSelectLocation') || t('selectLocationAlert'));
      return;
    }

    const readable = await getReadableAddress(finalLocation.latitude, finalLocation.longitude);
    setLocation({ latitude: finalLocation.latitude, longitude: finalLocation.longitude });
    setBaseAddress(readable);

    // Save base location for background service
    await AsyncStorage.setItem(
      "baseLocation",
      JSON.stringify({
        latitude: finalLocation.latitude,
        longitude: finalLocation.longitude,
      })
    );

    // Try to show a success toast if available, fall back to Android toast or Alert
    try {
      const ToastModule = await import('react-native-toast-message');
      const Toast = ToastModule.default || ToastModule;
      Toast.show({ type: 'success', text1: t('locationConfirmed') || 'Your location is confirmed.' });
    } catch (e) {
      try {
        const { Platform, ToastAndroid } = await import('react-native');
        if (Platform.OS === 'android' && ToastAndroid) {
          ToastAndroid.show(t('locationConfirmed') || 'Your location is confirmed.', ToastAndroid.SHORT);
        } else {
          Alert.alert(t('locationConfirmed') || 'Your location is confirmed.');
        }
      } catch (_) {
        Alert.alert(t('locationConfirmed') || 'Your location is confirmed.');
      }
    }

    setMapVisible(false);
    setTempLocation(null);
  };

  // ----- Use current location -----
  const useCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t('permissionDenied'), t('locationPermissionRequired'));
      return;
    }

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const readable = await getReadableAddress(loc.coords.latitude, loc.coords.longitude);

    setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    setBaseAddress(readable);

    await AsyncStorage.setItem(
      "baseLocation",
      JSON.stringify({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      })
    );
  };

  // ----- Update profile -----
  const handleUpdate = async () => {
    if (!name || !phone || !email) {
      Alert.alert(t('error'), t('fillAllFieldsError'));
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert(t('error'), t('noUserLoggedIn'));
      return;
    }

    try {
      if (email !== user.email) await updateEmail(user, email);

      const dataToSave: any = { name, email, phone, gender, baseAddress, photoURL: profileImageUrl };
      await saveUserData(user.uid, dataToSave);
      await AsyncStorage.setItem("baseAddress", baseAddress.trim());

      try {
        await updateProfile(user, { displayName: name, photoURL: profileImageUrl });
      } catch (e) {
        console.warn("updateProfile failed:", e);
      }

      initialData.current = { name, phone, email, gender, baseAddress };
      router.push("/Settings");
    } catch (err: any) {
      console.error(err);
      Alert.alert(t('error'), err?.message || t('unknownError'));
    }
  };

  // ----- Load saved base location without changing baseAddress -----
  const loadSavedBaseLocation = async () => {
    const saved = await AsyncStorage.getItem("baseLocation");
    if (!saved) return;

    const { latitude, longitude } = JSON.parse(saved);
    setLocation({ latitude, longitude }); // for map only
  };

  // ----- Load user data -----
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const data = await getUserData(user.uid);
        if (!mounted) return;

        if (data) {
          setName(data.name || "");
          setPhone(data.phone || "");
          setEmail(data.email || user.email || "");
          setGender(data.gender || "");
          setBaseAddress(data.baseAddress || "");
          setProfileImageUrl(generateEmailLetterAvatar(data.email || user.email || "U"));

          initialData.current = {
            name: data.name || "",
            phone: data.phone || "",
            email: data.email || user.email || "",
            gender: data.gender || "",
            baseAddress: data.baseAddress || "",
          };
        }
      } catch (err) {
        console.warn("Failed to load user data", err);
      }
    };

    load();
    loadSavedBaseLocation();

    return () => { mounted = false; };
  }, []);

  const hasUnsavedChanges = () =>
    name !== initialData.current.name ||
    phone !== initialData.current.phone ||
    email !== initialData.current.email ||
    gender !== initialData.current.gender ||
    baseAddress !== initialData.current.baseAddress;

  const handleBackPress = () => {
    if (!hasUnsavedChanges()) {
      router.push("/Settings");
      return;
    }

    Alert.alert(
      t('unsavedChanges'),
      t('unsavedChangesMessage'),
      [
        { text: t('cancel'), style: "cancel" },
        { text: t('close'), style: "destructive", onPress: () => router.push("/Settings") },
        { text: t('save'), onPress: handleUpdate },
      ]
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme === "dark" ? "#111" : "#FFF" }]}>
        <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} backgroundColor="#FF5C62" />

        <View style={styles.headerBg}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBackPress}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.title}>{t('editProfile')}</Text>
            <TouchableOpacity
              style={styles.iconRight}
              onPress={async () => {
                try {
                  const { Share } = await import('react-native');
                  if (Share) {
                    await Share.share({
                      message: t('shareProfileMessage', { name: name || t('unknownUser'), location: location ? `https://maps.google.com/?q=${location.latitude},${location.longitude}` : 'Unknown', phone: phone || 'Unknown' }),
                      title: t('shareProfile'),
                    });
                  }
                } catch (error) {
                  Alert.alert(t('error'), 'Failed to share profile');
                }
              }}
            >
              <Feather name="share-2" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.formContainer, { backgroundColor: theme === "dark" ? "#111" : "#FFF", paddingBottom: 100 }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme === "dark" ? "#ccc" : "#000" }]}>{t('name')}</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme === "dark" ? "#333" : "#fff",
                borderColor: theme === "dark" ? "#555" : "#FF5C62",
                color: theme === "dark" ? "#fff" : "#000"
              }]}
              placeholderTextColor={theme === "dark" ? "#ccc" : "#888"}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme === "dark" ? "#ccc" : "#000" }]}>{t('phoneNumber')}</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme === "dark" ? "#333" : "#fff",
                borderColor: theme === "dark" ? "#555" : "#FF5C62",
                color: theme === "dark" ? "#fff" : "#000"
              }]}
              placeholderTextColor={theme === "dark" ? "#ccc" : "#888"}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme === "dark" ? "#ccc" : "#000" }]}>{t('email')}</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme === "dark" ? "#333" : "#fff",
                borderColor: theme === "dark" ? "#555" : "#FF5C62",
                color: theme === "dark" ? "#fff" : "#000"
              }]}
              placeholderTextColor={theme === "dark" ? "#ccc" : "#888"}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme === "dark" ? "#ccc" : "#000" }]}>{t('gender')}</Text>
            <View style={styles.genderContainer}>
              {['Male', 'Female', 'Other'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.genderButton,
                    {
                      backgroundColor: gender === item ? "#FF5C62" : (theme === "dark" ? "#333" : "#FFF"),
                      borderColor: theme === "dark" ? "#555" : "#FF5C62",
                    }
                  ]}
                  onPress={() => setGender(item)}
                >
                  <Text style={[
                    styles.genderButtonText,
                    { color: gender === item ? "#FFF" : (theme === "dark" ? "#ccc" : "#000") }
                  ]}>
                    {t(item.toLowerCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme === "dark" ? "#ccc" : "#000" }]}>{t('address')}</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme === "dark" ? "#333" : "#fff",
                borderColor: theme === "dark" ? "#555" : "#FF5C62",
                color: theme === "dark" ? "#fff" : "#000"
              }]}
              placeholderTextColor={theme === "dark" ? "#ccc" : "#888"}
              value={baseAddress}
              onChangeText={setBaseAddress}
            />
            <TouchableOpacity
              style={[styles.locationButton, { backgroundColor: theme === "dark" ? "#333" : "#FFE8E8" }]}
              onPress={async () => {
                if (!location) {
                  setIsFetchingLocation(true);
                  try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                    } else {
                      // Fallback to a default if denied but they want the map
                      setLocation({ latitude: 12.9716, longitude: 77.5946 }); // Bangalore default
                    }
                  } catch (e) {
                    console.warn("Location fetch failed", e);
                  } finally {
                    setIsFetchingLocation(false);
                  }
                }
                setMapVisible(true);
              }}
            >
              <Text style={[styles.locationButtonText, { color: theme === "dark" ? "#ccc" : "#FF5C62" }]}>
                {isFetchingLocation ? t('gettingLocation') || "Getting Location..." : t('pickFromMap')}
              </Text>
            </TouchableOpacity>
          </View>

          {mapVisible && (
            <View style={{ marginVertical: 10 }}>
              {isFetchingLocation ? (
                <View style={{ height: 250, justifyContent: 'center', alignItems: 'center', backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9', borderRadius: 12 }}>
                  <ActivityIndicator size="large" color="#FF5C62" />
                  <Text style={{ marginTop: 10, color: theme === 'dark' ? '#ccc' : '#666' }}>{t('gettingLocation') || "Getting Location..."}</Text>
                </View>
              ) : location ? (
                <WebView
                  style={{ height: 250, borderRadius: 12 }}
                  originWhitelist={["*"]}
                  source={{
                    html: getMapHtml(location.latitude, location.longitude, tempLocation)
                  }}
                  onMessage={(event: any) => {
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
              ) : null}

              {location && (
                <View style={styles.mapButtonRow}>
                  <TouchableOpacity style={styles.saveLocationButton} onPress={useCurrentLocation}>
                    <Text style={styles.saveLocationText}>{t('useCurrentLocationButton')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveLocationButton} onPress={handleConfirmMapSelection}>
                    <Text style={styles.saveLocationText}>{t('confirm')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.buttonOutline, { borderColor: theme === "dark" ? "#555" : "#FF5C62" }]} onPress={() => router.push("/ChangePassword")}>
              <Text style={[styles.buttonOutlineText, { color: theme === "dark" ? "#ccc" : "#FF5C62" }]}>{t('changePassword')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonFilled} onPress={handleUpdate}>
              <Text style={styles.buttonFilledText}>{t('updateAndGo')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.avatarContainer}>
          <AvatarComponent email={name || email || "U"} size={76} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF" },
  headerBg: { backgroundColor: "#FF5C62", height: HEADER_HEIGHT, alignItems: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", padding: 16, alignItems: "center" },
  iconArrow: { color: "#FFF", fontSize: 24 },
  iconRight: {},
  title: { color: "#FFF", fontSize: 18, fontWeight: "600" },
  avatarContainer: { position: "absolute", top: HEADER_HEIGHT - AVATAR_SIZE / 2, alignSelf: "center", zIndex: 10 },
  formContainer: { paddingTop: AVATAR_SIZE / 2 + 40, paddingHorizontal: 22 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 15, fontWeight: "500" },
  input: { borderWidth: 1.5, borderColor: "#FF5C62", borderRadius: 10, padding: 10 },
  genderContainer: { flexDirection: 'row', gap: 10, marginTop: 10 },
  genderButton: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  genderButtonText: { fontSize: 14, fontWeight: '600' },
  locationButton: { marginTop: 8, backgroundColor: "#FFE8E8", paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  locationButtonText: { color: "#FF5C62", fontWeight: "600" },
  saveLocationButton: { flex: 1, backgroundColor: "#FF5C62", padding: 12, borderRadius: 8, alignItems: "center", marginHorizontal: 5, minHeight: 45, justifyContent: 'center' },
  saveLocationText: { color: "#FFF", fontWeight: "600", textAlign: 'center' },
  mapButtonRow: { flexDirection: "row", marginTop: 10, flexWrap: 'wrap' },
  buttonRow: { flexDirection: "row", marginTop: 24 },
  buttonOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#FF5C62",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginRight: 10,
    alignItems: "center",
    justifyContent: 'center',
    minHeight: 50
  },
  buttonOutlineText: {
    color: "#FF5C62",
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center'
  },
  buttonFilled: {
    flex: 1,
    backgroundColor: "#FF5C62",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: 'center',
    minHeight: 50
  },
  buttonFilledText: {
    color: "#FFF",
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center'
  },
});