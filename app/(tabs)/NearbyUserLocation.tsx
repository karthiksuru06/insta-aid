import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { signInAnonymously } from 'firebase/auth';
import { GeoPoint, addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function NearbyUserLocation() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // try to populate nearby once screen mounts
    findNearby(1000).catch((e) => console.warn(e));
  }, []);

  const findNearby = async (radiusMeters = 1000) => {
    setLoading(true);
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      const u = auth.currentUser;
      if (!u) throw new Error('no-auth');

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('nearbyUsers.permissionDenied'), t('nearbyUsers.locationPermissionRequired'));
        setLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.LocationAccuracy.Highest });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // update own location
      const userRef = doc(db, 'users', u.uid);
      await setDoc(userRef, { location: new GeoPoint(lat, lng), location_lat: lat, location_lng: lng, lastSeen: serverTimestamp(), online: true }, { merge: true });

      // bounding box
      const radiusKm = radiusMeters / 1000;
      const latDelta = radiusKm / 110.574;
      const minLat = lat - latDelta;
      const maxLat = lat + latDelta;

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('location_lat', '>=', minLat), where('location_lat', '<=', maxLat));
      const snap = await getDocs(q);
      const nearby: any[] = [];
      snap.forEach((d) => {
        const data: any = d.data();
        if (!data.location_lat || !data.location_lng) return;
        if (d.id === u.uid) return;
        if (data.online === false) return;
        const distKm = haversineDistance(lat, lng, data.location_lat, data.location_lng);
        if (distKm <= radiusKm) nearby.push({ uid: d.id, ...data, distanceKm: distKm });
      });

      setNearbyUsers(nearby);
      setCount(nearby.length);
    } catch (err) {
      console.warn(err);
      Alert.alert(t('nearbyUsers.error'), t('nearbyUsers.failedToFind'));
    } finally {
      setLoading(false);
    }
  };

  const sendLocationToNearby = async () => {
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      const u = auth.currentUser;
      if (!u) throw new Error('no-auth');

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('nearbyUsers.permissionDenied'), t('nearbyUsers.locationPermissionRequired'));
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.LocationAccuracy.Highest });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      for (const t of nearbyUsers) {
        try {
          await addDoc(collection(db, 'users', t.uid, 'alerts'), { from: u.uid, type: 'location_alert', coords: { latitude: lat, longitude: lng }, message: 'Nearby InstaAid member needs help', createdAt: serverTimestamp() });
        } catch (err) {
          console.warn('failed alert', err);
        }
      }

      Alert.alert(t('nearbyUsers.sentTitle'), t('nearbyUsers.sentMessage', { count: nearbyUsers.length }));
    } catch (err) {
      console.warn(err);
      Alert.alert(t('nearbyUsers.error'), t('nearbyUsers.failedToSend'));
    }
  };

  return (
    <SafeAreaView style={nearbyStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={nearbyStyles.container}>
        <TouchableOpacity style={nearbyStyles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={nearbyStyles.countCircle}>
          <Text style={nearbyStyles.countText}>{count}</Text>
        </View>

        <Text style={nearbyStyles.title}>{t('nearbyUsers.alertingTitle')}</Text>
        <Text style={nearbyStyles.subtitle}>{t('nearbyUsers.alertingSubtitle')}</Text>

        <View style={nearbyStyles.avatarArea}>
          {/* center icon */}
          <View style={nearbyStyles.centerIcon}></View>
          {nearbyUsers.map((u, i) => {
            const angle = (i / nearbyUsers.length) * Math.PI * 2;
            const r = 70;
            const x = Math.round(r * Math.cos(angle));
            const y = Math.round(r * Math.sin(angle));
            return (
              <Image key={u.uid || i} source={u.avatarURL ? { uri: u.avatarURL } : undefined} style={[nearbyStyles.avatar, { left: 90 + x, top: 90 + y }]} />
            );
          })}
        </View>

        <TouchableOpacity style={nearbyStyles.sendBtn} onPress={sendLocationToNearby}>
          <Text style={{ color: '#111', fontWeight: '700' }}>{t('nearbyUsers.shareWithAll')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const nearbyStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ED4C4C', alignItems: 'center', paddingTop: 18 },
  back: { position: 'absolute', left: 12, top: 18, padding: 8 },
  countCircle: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 36 },
  countText: { fontSize: 36, color: '#fff', fontWeight: '700' },
  title: { color: '#fff', fontWeight: '700', fontSize: 18, marginTop: 18 },
  subtitle: { color: '#fff', fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 28 },
  avatarArea: { width: 180, height: 180, marginTop: 18, position: 'relative' },
  centerIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignSelf: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, position: 'absolute' },
  sendBtn: { position: 'absolute', bottom: 22, left: 18, right: 18, backgroundColor: '#fff', paddingVertical: 14, borderRadius: 28, alignItems: 'center' },
});
