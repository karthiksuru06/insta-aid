import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import { onAuthStateChanged, User } from 'firebase/auth';
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../components/ThemeContext';
import { auth, db } from '../../firebaseConfig';

type Contact = {
  name: string;
  phone: string;
  avatarURL?: string | null;
};

export default function ContactLocation() {
  const { t, i18n } = useTranslation();
  // FORCE DEBUG: Check if translation key works
  console.log('Current Language:', i18n.language);
  console.log('Test Translation:', t('contactLocation.shareLocationTitle'));
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setContacts([]);
        setLoading(false);
      } else {
        const userRef = doc(db, 'users', u.uid);
        const unsubSnap = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as any;
              setContacts(data.emergencyContacts ?? []);
            } else {
              setContacts([]);
            }
            setLoading(false);
          },
          (err) => {
            console.warn('contacts snapshot error', err);
            setLoading(false);
          }
        );

        return () => unsubSnap();
      }
    });

    return () => unsubAuth();
  }, []);

  const fetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('contactLocation.permissionDeniedTitle'), t('contactLocation.permissionDeniedMessage'));
        return null;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.LocationAccuracy.Highest,
      });
      return pos.coords;
    } catch (err) {
      console.warn('fetch location error', err);
      Alert.alert(t('contactLocation.errorTitle'), t('contactLocation.failedToFetchLocation'));
      return null;
    }
  };

  const sendSms = async (phones: string[], message: string) => {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        await SMS.sendSMSAsync(phones, message);
        console.log('SMS sent successfully');
      } else {
        Alert.alert(t('contactLocation.smsNotAvailableTitle'), t('contactLocation.smsNotAvailableMessage'));
      }
    } catch (err) {
      console.warn('SMS send error', err);
      Alert.alert(t('contactLocation.errorTitle'), t('contactLocation.smsSendError'));
    }
  };

  const logAlert = async (type: string, details: any = {}) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await addDoc(collection(db, 'alerts'), {
        userId: user.uid,
        type,
        details,
        timestamp: serverTimestamp(),
      });
      // Optionally: console.log('Alert logged:', type, details);
    } catch (e) {
      console.warn('Failed to log alert', e);
      Alert.alert(t('contactLocation.loggingErrorTitle'), t('contactLocation.loggingErrorMessage'));
    }
  };

  const handleShareToContact = async (contact: Contact) => {
    const coords = await fetchLocation();
    if (!coords) return;

    const coordsLink = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
    const message = `📍 Check my location: ${coordsLink}`;

    const phones = contact.phone ? [contact.phone] : [];
    if (phones.length === 0) {
      Alert.alert(t('contactLocation.errorTitle'), t('contactLocation.noPhoneMessage'));
      return;
    }

    await sendSms(phones, message);
    await logAlert('LOCATION_SHARED', { recipientName: contact.name, phone: contact.phone });

    if (Platform.OS === 'android') {
      ToastAndroid.show(`Location shared with ${contact.name}`, ToastAndroid.SHORT);
    } else {
      Alert.alert(t('contactLocation.locationSharedTitle'), t('contactLocation.locationSharedWith', { name: contact.name }));
    }
  };

  const handleShareToAll = async () => {
    if (!contacts.length) {
      Alert.alert(t('contactLocation.noContactsTitle'), t('contactLocation.noContactsMessage'));
      return;
    }

    const coords = await fetchLocation();
    if (!coords) return;

    const coordsLink = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
    const message = `📍 Check my location: ${coordsLink}`;

    const phones = contacts
      .map((c) => c.phone)
      .filter((p): p is string => !!p);

    if (phones.length === 0) {
      Alert.alert(t('contactLocation.errorTitle'), t('contactLocation.noPhoneMessage'));
      return;
    }

    await sendSms(phones, message);
    await logAlert('LOCATION_SHARED_ALL', { recipientCount: phones.length });

    if (Platform.OS === 'android') {
      ToastAndroid.show(`Location shared with ${phones.length} contact${phones.length > 1 ? 's' : ''}`, ToastAndroid.SHORT);
    } else {
      Alert.alert(
        t('contactLocation.locationSharedTitle'),
        t('contactLocation.locationSharedWithAll', { count: contacts.length })
      );
    }
  };

  const renderItem = ({ item }: { item: Contact }) => (
    <View style={[styles.card, { backgroundColor: theme === 'dark' ? '#333' : '#fff', borderColor: theme === 'dark' ? '#555' : '#f0f0f0' }]}>
      <View style={styles.leftRow}>
        {item.avatarURL ? (
          <Image
            source={{ uri: item.avatarURL }}
            style={styles.avatar}
            onError={() => { }}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme === 'dark' ? '#555' : '#f2f2f2' }]}>
            <Text style={[styles.avatarLetter, { color: theme === 'dark' ? '#fff' : '#333' }]}>
              {(item.name?.[0] || '?').toUpperCase()}
            </Text>
          </View>
        )}

        <View>
          <Text style={[styles.name, { color: theme === 'dark' ? '#fff' : '#111' }]}>{item.name}</Text>
          <Text style={[styles.phone, { color: theme === 'dark' ? '#ccc' : '#666' }]}>{item.phone}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.shareBtn, { borderColor: theme === 'dark' ? '#555' : '#FF6B6B' }]}
        onPress={() => handleShareToContact(item)}
      >
        <Text style={[styles.shareBtnText, { color: theme === 'dark' ? '#ccc' : '#FF3B30' }]}>{t('contactLocation.shareLocationButton')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView key={i18n.language} style={[styles.safe, { backgroundColor: theme === 'dark' ? '#111' : '#fff' }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme === 'dark' ? '#111' : '#fff'} />

      {/* Premium Header */}
      <View style={[styles.header, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#F8F8F8', borderBottomColor: theme === 'dark' ? '#333' : '#eee' }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backIcon, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fafafa' }]}>
          <Ionicons name="chevron-back" size={24} color={theme === 'dark' ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme === 'dark' ? '#fff' : '#111' }]}>{t('contactLocation.shareLocationTitle')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Contact list */}
      <FlatList
        data={contacts}
        extraData={i18n.language}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 100,
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="person-add-outline" size={48} color={theme === 'dark' ? '#555' : '#ccc'} />
            <Text style={[styles.emptyText, { color: theme === 'dark' ? '#999' : '#999' }]}>{t('contactLocation.noContactsMessage')}</Text>
          </View>
        }
      />

      {/* Floating Share All button above navbar */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={[styles.shareAllBtn, { shadowColor: theme === 'dark' ? '#000' : '#FF6464' }]}
          onPress={handleShareToAll}
          activeOpacity={0.85}
        >
          <Ionicons name="share-social" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.shareAllText}>{t('contactLocation.shareWithAll')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  backIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111', flex: 1, textAlign: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 12,
  },
  leftRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLetter: { fontWeight: '700', color: '#333', fontSize: 18 },
  name: { fontSize: 15, fontWeight: '700', color: '#111' },
  phone: { color: '#666', marginTop: 4, fontSize: 13 },

  shareBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6464',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  shareBtnText: { color: '#FF6464', fontWeight: '700', fontSize: 14 },

  empty: { padding: 48, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#999', marginTop: 16, fontSize: 16, fontWeight: '500' },

  // Floating button styling
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
  },
  shareAllBtn: {
    backgroundColor: '#FF6464',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#FF6464',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  shareAllText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});