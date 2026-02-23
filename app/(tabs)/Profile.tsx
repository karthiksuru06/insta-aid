import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { AvatarComponent } from '../../components/AvatarComponent';
import { useTheme } from '../../components/ThemeContext';
import { auth, db } from '../../firebaseConfig';

import { useTranslation } from 'react-i18next';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          router.replace('../Login');
          return;
        }
        const docRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          if (mounted) setUserData(snap.data());
        } else {
          // fallback to auth profile
          if (mounted) setUserData({
            name: currentUser.displayName ?? '',
            email: currentUser.email ?? '',
            phone: '',
            gender: '',
            baseAddress: '',
            emergencyContacts: []
          });
        }
      } catch (e: any) {
        if (mounted) setError(e.message || t('failedToLoadProfile'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadUser();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogout = () => {
    Alert.alert(t('signOut'), t('confirmSignOut'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('signOut'),
        style: 'destructive',
        onPress: async () => {
          if (auth.currentUser) {
            await import('../../services/firebaseServices').then(async (m) => {
              await m.updateUserStatus(auth.currentUser!.uid, 'Inactive'); // Set Inactive
            }).catch(err => console.log("Logout Log Error", err));
          }
          const { googleSignOut } = await import('../../services/googleAuthHelper');
          await googleSignOut();
          await signOut(auth);
          router.replace('../Login');
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#ED4C4C" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ color: '#f00' }}>{error}</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={{ color: '#ED4C4C', marginTop: 12 }}>{t('goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const contacts: any[] = userData?.emergencyContacts ?? [];

  return (
    <ScrollView style={{ backgroundColor: theme === "dark" ? "#111" : "#fff" }} contentContainerStyle={[styles.container, { backgroundColor: theme === "dark" ? "#111" : "#fff" }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme === "dark" ? "#222" : "#ED4C4C" }]}>
        <View style={styles.headerLeft}>
          <AvatarComponent email={userData?.email || 'U'} size={62} />
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: theme === "dark" ? "#fff" : "#fff" }]}>{userData?.name ?? 'Unnamed'}</Text>
            <Text style={[styles.mobile, { color: theme === "dark" ? "#ccc" : "#fff" }]}>{userData?.phone ?? userData?.email ?? ''}</Text>
          </View>
        </View>

      </View>

      {/* Details */}
      <View style={styles.detailsBox}>
        <View style={[styles.infoCard, { backgroundColor: theme === "dark" ? "#222" : "#FFF", borderColor: theme === "dark" ? "#555" : "#ED4C4C" }]}>
          <MaterialIcons name="email" size={22} color="#ED4C4C" />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('email')}</Text>
            <Text style={[styles.infoValue, { color: theme === "dark" ? "#ccc" : "#333" }]}>{userData?.email ?? '-'}</Text>
          </View>
        </View>
        <View style={[styles.infoCard, { backgroundColor: theme === "dark" ? "#222" : "#FFF", borderColor: theme === "dark" ? "#555" : "#ED4C4C" }]}>
          <Ionicons name={userData?.gender === 'Male' ? "male" : (userData?.gender === 'Female' ? "female" : "person")} size={22} color="#ED4C4C" />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('gender')}</Text>
            <Text style={[styles.infoValue, { color: theme === "dark" ? "#ccc" : "#333" }]}>{userData?.gender ? t(userData.gender.toLowerCase()) : '-'}</Text>
          </View>
        </View>
        <View style={[styles.infoCard, { backgroundColor: theme === "dark" ? "#222" : "#FFF", borderColor: theme === "dark" ? "#555" : "#ED4C4C" }]}>
          <MaterialIcons name="person-pin" size={22} color="#ED4C4C" />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('baseAddress')}</Text>
            <Text style={[styles.infoValue, { color: theme === "dark" ? "#ccc" : "#333" }]}>{userData?.baseAddress ?? '-'}</Text>
          </View>
        </View>
      </View>

      {/* Emergency Contacts */}
      <Text style={[styles.sectionTitle, { color: theme === "dark" ? "#fff" : "#000" }]}>{t('emergencyContacts')}</Text>
      <View style={styles.contactBox}>
        {contacts.length === 0 && <Text style={{ paddingHorizontal: 24, color: theme === "dark" ? "#ccc" : '#666' }}>{t('noEmergencyContacts')}</Text>}
        {contacts.map((c, i) => (
          <View style={[styles.contactCard, { backgroundColor: theme === "dark" ? "#222" : "#FFF", borderColor: theme === "dark" ? "#555" : "#ED4C4C" }]} key={i}>
            <AvatarComponent email={c.name || 'C'} size={40} />
            <View style={styles.contactContent}>
              <Text style={[styles.contactName, { color: theme === "dark" ? "#fff" : "#000" }]}>{c.name ?? 'Unknown'}</Text>
              <Text style={[styles.contactMobile, { color: theme === "dark" ? "#ccc" : "#333" }]}>{c.phone ?? '-'}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Buttons */}
      <View style={[styles.buttonRow, { backgroundColor: theme === "dark" ? "#111" : "#fff" }]}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme === "dark" ? "#333" : "#F2F2F2" }]} onPress={() => router.back()}>
          <Text style={[styles.actionButtonText, { color: theme === "dark" ? "#fff" : "#ED4C4C" }]}>{t('close')}</Text>
        </TouchableOpacity>
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: pressed ? "#ED4C4C" : (theme === "dark" ? "#E04848" : "#ffeeee") }
          ]}
          onPress={handleLogout}
        >
          {({ pressed }) => (
            <Text style={[styles.logoutButtonText, { color: (pressed || theme === "dark") ? "#fff" : "#ED4C4C" }]}>
              {t('logout')}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Bottom Tab Bar */}
      {/* <BottomTabBar activeTab="Home" /> */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 100, backgroundColor: '#fff' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', height: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ED4C4C',
    padding: 24,
    paddingTop: 60,
    marginBottom: 18
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: '#fff' },
  headerInfo: { flex: 1, marginLeft: 12 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  mobile: { fontSize: 14, color: '#fff' },

  detailsBox: { marginBottom: 18, gap: 14, paddingHorizontal: 24 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#ED4C4C',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12
  },
  infoContent: { marginLeft: 12, flex: 1 },
  infoLabel: { fontWeight: 'bold', color: '#000', fontSize: 16, marginBottom: 4 },
  infoValue: { color: '#333', fontSize: 14 },
  sectionTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 10, paddingHorizontal: 24 },
  contactBox: { gap: 12, marginBottom: 24, paddingHorizontal: 24 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#ED4C4C',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12
  },
  contactContent: { marginLeft: 12, flex: 1 },
  contactAvatar: { width: 40, height: 40, borderRadius: 20 },
  contactName: { fontWeight: 'bold', color: '#000', fontSize: 16, marginBottom: 4 },
  contactMobile: { color: '#333', fontSize: 14 },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 24, paddingBottom: 80, marginTop: 20 },
  actionButton: { backgroundColor: "#F2F2F2", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 28, alignItems: 'center' },
  actionButtonText: { color: "#ED4C4C", fontWeight: 'bold', fontSize: 16 },
  logoutButton: { backgroundColor: "#F2F2F2", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 28, alignItems: 'center' },
  logoutButtonText: { color: "#ED4C4C", fontWeight: 'bold', fontSize: 16 },
});