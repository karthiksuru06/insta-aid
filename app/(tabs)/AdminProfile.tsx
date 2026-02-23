import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';

export default function AdminProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          router.replace('/Login');
          return;
        }

        const email = currentUser.email;
        if (!email) {
          // no email -> just show basic info
          if (mounted) {
            setUserData({
              name: currentUser.displayName ?? 'Admin',
              email: '',
              phone: '',
            });
          }
          return;
        }

        // 🔴 IMPORTANT: read from "admin" collection, doc id = email
        const docRef = doc(db, 'admin', email);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          if (mounted) {
            const data = snap.data();
            setUserData({
              name: data.name ?? currentUser.displayName ?? 'Admin',
              email: email,
              phone: data.phone ?? '',
              gender: data.gender ?? '',
              address: data.address ?? '',
              role: data.role ?? 'admin',
            });
          }
        } else {
          // fallback if admin doc not found
          if (mounted) {
            setUserData({
              name: currentUser.displayName ?? 'Admin',
              email: email,
              phone: '',
              gender: '',
              address: '',
            });
          }
        }
      } catch (e: any) {
        if (mounted) {
          setError(e.message || 'Failed to load admin profile');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Do you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          if (auth.currentUser) {
            await import('../../services/firebaseServices').then(async (m) => {
              await m.logUserActivity(auth.currentUser!.uid, 'USER_LOGOUT');
              await m.updateUserStatus(auth.currentUser!.uid, 'Inactive'); // Set Inactive
            }).catch(err => console.log("Logout Log Error", err));
          }
          const { googleSignOut } = await import('../../services/googleAuthHelper');
          await googleSignOut();
          await signOut(auth);
          router.replace('/Login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ED4C4C" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#f00' }}>{error}</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={{ color: '#ED4C4C', marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/Admindashboard')}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Details</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Content card */}
      <View style={styles.container}>
        {/* Name */}
        <View style={styles.rowCard}>
          <View style={styles.iconBox}>
            <Ionicons name="person" size={22} color="#ED4C4C" />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>
              {userData?.name ?? 'Unnamed Admin'}
            </Text>
          </View>
        </View>

        {/* Email */}
        <View style={styles.rowCard}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons
              name="email-outline"
              size={22}
              color="#ED4C4C"
            />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{userData?.email ?? '-'}</Text>
          </View>
        </View>

        {/* Phone number */}
        <View style={styles.rowCard}>
          <View style={styles.iconBox}>
            <Ionicons name="call-outline" size={22} color="#ED4C4C" />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.label}>Phone number</Text>
            <Text style={styles.value}>
              {userData?.phone || '+91XXXXXXXXXX'}
            </Text>
          </View>
        </View>


        {/* Bottom buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.replace('/Admindashboard')}
          >
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export const options = {
  tabBarStyle: { display: "none" },
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ED4C4C',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ED4C4C',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ED4C4C',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  iconBox: {
    width: 32,
    alignItems: 'center',
    marginRight: 10,
  },
  textBox: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 20,
  },
  closeBtn: {
    flex: 1,
    marginRight: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ED4C4C',
    backgroundColor: '#fff',
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeText: {
    color: '#ED4C4C',
    fontWeight: '700',
    fontSize: 15,
  },
  logoutBtn: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 10,
    backgroundColor: '#ED4C4C',
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});