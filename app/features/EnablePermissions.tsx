// EnablePermission.tsx
import { Entypo, FontAwesome, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next'; import { useTheme } from '../../components/ThemeContext'; import {
  Alert,
  BackHandler,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Linking,
} from 'react-native';
import { AvatarComponent } from '../../components/AvatarComponent';
import { getUserData } from '../../services/firebaseServices';
import { auth } from '../../utils/firebaseConfig';

const { width } = Dimensions.get('window');

const STORAGE_KEYS = {
  location: "locationEnabled",
  sms: "smsEnabled",
  contacts: "contactsEnabled",
  location_requested: "locationRequested",
  sms_requested: "smsRequested",
  contacts_requested: "contactsRequested",
  permissions_completed: "permissions_completed",
  first_launch: "first_launch_completed",
};

type PermissionStatus = 'granted' | 'denied' | 'pending';

export default function EnablePermission() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [locationStatus, setLocationStatus] = useState<PermissionStatus>('pending');
  const [smsStatus, setSMSStatus] = useState<PermissionStatus>('pending');
  const [contactsStatus, setContactsStatus] = useState<PermissionStatus>('pending');

  const [locationToggled, setLocationToggled] = useState(false);
  const [smsToggled, setSmsToggled] = useState(false);
  const [contactsToggled, setContactsToggled] = useState(false);

  const [userEmail, setUserEmail] = useState<string>('U');
  const [completed, setCompleted] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const requestQueueRef = useRef<boolean>(false);

  // Block hardware back button during first-time setup
  useEffect(() => {
    if (!isFirstLaunch) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Prevent going back during first-time setup
      return true;
    });
    return () => backHandler.remove();
  }, [isFirstLaunch]);

  // Check initial permission statuses
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const user = auth.currentUser;
        if (!user?.email) return;

        // Check if user is coming from Settings (permissions already completed)
        const permCompleted = await AsyncStorage.getItem(
          `permissions_completed_${user.email}`
        );
        const isComingFromSettings = permCompleted === 'true';
        setIsFirstLaunch(!isComingFromSettings);
        setCompleted(isComingFromSettings);

        if (isComingFromSettings) {
          // User from Settings: Load and show previously saved state
          console.log('EnablePermissions: Loading saved state from Settings');
          const savedLocationToggled = await AsyncStorage.getItem(STORAGE_KEYS.location);
          const savedSmsToggled = await AsyncStorage.getItem(STORAGE_KEYS.sms);
          const savedContactsToggled = await AsyncStorage.getItem(STORAGE_KEYS.contacts);

          setLocationToggled(savedLocationToggled === 'true');
          setSmsToggled(savedSmsToggled === 'true');
          setContactsToggled(savedContactsToggled === 'true');

          setLocationStatus(savedLocationToggled === 'true' ? 'granted' : 'denied');
          setSMSStatus(savedSmsToggled === 'true' ? 'granted' : 'denied');
          setContactsStatus(savedContactsToggled === 'true' ? 'granted' : 'denied');
        } else {
          // First-time user: Start with all toggles OFF
          console.log('EnablePermissions: First-time user, starting with all toggles OFF');
          setLocationToggled(false);
          setSmsToggled(false);
          setContactsToggled(false);

          setLocationStatus('denied');
          setSMSStatus('denied');
          setContactsStatus('denied');
        }
      } catch (e) {
        console.warn('Failed to check permissions', e);
        // Default to first-time user on error
        setIsFirstLaunch(true);
        setLocationToggled(false);
        setSmsToggled(false);
        setContactsToggled(false);
      }
    };

    checkPermissions();
  }, []);

  // Request permissions automatically on first launch - DISABLED for first-time users to keep toggles OFF
  // useEffect(() => {
  //   if (!isFirstLaunch || requestQueueRef.current) return;
  //   
  //   requestQueueRef.current = true;
  //   requestPermissionsSequentially();
  // }, [isFirstLaunch]);

  const requestPermissionsSequentially = async () => {
    try {
      // Request Location first
      await requestLocationPermission();
      // Then SMS
      await requestSMSPermission();
      // Finally Contacts
      await requestContactsPermission();

      // Mark first launch as completed
      await AsyncStorage.setItem(STORAGE_KEYS.first_launch, 'true');
    } catch (e) {
      console.warn('Error requesting permissions sequentially:', e);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const newStatus = status === 'granted' ? 'granted' : 'denied';
      setLocationStatus(newStatus);
      setLocationToggled(status === 'granted');
      await AsyncStorage.setItem(STORAGE_KEYS.location_requested, 'true');

      if (status === 'granted') {
        // Request background location if on iOS 11+
        if (Platform.OS === 'ios') {
          await Location.requestBackgroundPermissionsAsync();
        }
      }
    } catch (e) {
      console.warn('Location permission error:', e);
    }
  };

  const requestSMSPermission = async () => {
    try {
      const available = await SMS.isAvailableAsync();
      setSMSStatus(available ? 'granted' : 'denied');
      setSmsToggled(available);
      await AsyncStorage.setItem(STORAGE_KEYS.sms_requested, 'true');
    } catch (e) {
      console.warn('SMS permission error:', e);
    }
  };

  const requestContactsPermission = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      const newStatus = status === 'granted' ? 'granted' : 'denied';
      setContactsStatus(newStatus);
      setContactsToggled(status === 'granted');
      await AsyncStorage.setItem(STORAGE_KEYS.contacts_requested, 'true');
    } catch (e) {
      console.warn('Contacts permission error:', e);
    }
  };

  const openAppSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Open iOS Settings app - opens the app settings page
        const iosSettingsUrl = 'app-settings:';
        await Linking.openURL(iosSettingsUrl);
      } else {
        // Open Android app settings
        const androidSettingsUrl = 'package:' + (await getApplicationId());
        await Linking.openURL(`android.settings.APPLICATION_DETAILS_SETTINGS:${androidSettingsUrl}`);
      }
    } catch (e) {
      console.warn('Error opening settings:', e);
      Alert.alert(
        'Open Settings Manually',
        Platform.OS === 'ios'
          ? 'Go to Settings > InstaAid > Permissions and enable the required permission.'
          : 'Go to Settings > Apps > InstaAid > Permissions and enable the required permission.'
      );
    }
  };

  const getApplicationId = async (): Promise<string> => {
    try {
      // Try to get package name from constants or return default
      // This is a fallback - in production you'd use expo-application or similar
      return 'com.example.instaid';
    } catch {
      return 'com.example.instaid';
    }
  };

  const handleRetryPermission = async (type: string) => {
    // Always attempt to request the permission
    switch (type) {
      case 'location':
        await requestLocationPermission();
        break;
      case 'sms':
        await requestSMSPermission();
        break;
      case 'contacts':
        await requestContactsPermission();
        break;
    }
  };

  const allPermissionsGranted =
    locationToggled &&
    smsToggled &&
    contactsToggled;

  // Removed auto-navigation - only navigate on button click

  // Removed auto-navigation to keep the page alive until user proceeds

  useEffect(() => {
    const loadProfileImage = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const data = await getUserData(user.uid);
          if (data?.email) setUserEmail(data.email);
          else if (user.email) setUserEmail(user.email);
        }
      } catch (e) {
        console.warn('Failed to load profile image', e);
      }
    };

    loadProfileImage();
  }, []);

  const getStatusColor = (status: PermissionStatus): string => {
    switch (status) {
      case 'granted':
        return '#E04848';
      case 'denied':
        return '#F76E64';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: PermissionStatus): string => {
    switch (status) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      default:
        return 'Pending';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? "#111" : "#fff" }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          {!isFirstLaunch && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={28} color={isDark ? "#fff" : "#222"} />
            </TouchableOpacity>
          )}
          {isFirstLaunch && <View style={styles.backButton} />}
          <Text style={[styles.headerText, { color: isDark ? "#fff" : "#222" }]}>{t('enableAppPermissions')}</Text>
          <View style={styles.headerRight}>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { borderColor: isDark ? "#444" : "#E0E0E0" }]} />
      <Text style={[styles.subheading, { color: isDark ? "#aaa" : "#7C7C80" }]}>
        {t('permissionsSubheading')}
      </Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.permList}>
          {/* Location */}
          <View style={[styles.permRow, { backgroundColor: isDark ? "#1e1e1e" : "#FAFAFA" }]}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? "#2a1a1a" : "#FFF2F1" }]}>
              <Entypo name="location-pin" size={24} color="#F76E64" />
            </View>
            <View style={styles.permTextBox}>
              <Text style={[styles.permTitle, { color: isDark ? "#fff" : "#000" }]}>{t('locationAccess')}</Text>
              <Text style={[styles.permDesc, { color: isDark ? "#aaa" : "#7C7C80" }]}>
                {t('locationAccessDesc')}
              </Text>
              <Text style={[styles.statusText, { color: getStatusColor(locationStatus) }]}>
                {locationToggled ? getStatusText(locationStatus) : 'Off'}
              </Text>
            </View>
            <Switch
              value={locationToggled}
              onValueChange={async (value) => {
                setLocationToggled(value);
                await AsyncStorage.setItem(STORAGE_KEYS.location, value.toString());
                if (value) {
                  await requestLocationPermission();
                }
              }}
              trackColor={{ false: isDark ? '#444' : '#E8E8E8', true: '#FFE5E5' }}
              thumbColor={locationToggled ? '#E04848' : isDark ? '#666' : '#ffffff'}
              ios_backgroundColor={isDark ? '#444' : '#ddd'}
            />
          </View>

          {/* SMS */}
          <View style={[styles.permRow, { backgroundColor: isDark ? "#1e1e1e" : "#FAFAFA" }]}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? "#2a1a1a" : "#FFF2F1" }]}>
              <FontAwesome name="envelope" size={20} color="#F76E64" />
            </View>
            <View style={styles.permTextBox}>
              <Text style={[styles.permTitle, { color: isDark ? "#fff" : "#000" }]}>{t('smsAccess')}</Text>
              <Text style={[styles.permDesc, { color: isDark ? "#aaa" : "#7C7C80" }]}>
                {t('smsAccessDesc')}
              </Text>
              <Text style={[styles.statusText, { color: getStatusColor(smsStatus) }]}>
                {smsToggled ? getStatusText(smsStatus) : 'Off'}
              </Text>
            </View>
            <Switch
              value={smsToggled}
              onValueChange={async (value) => {
                setSmsToggled(value);
                await AsyncStorage.setItem(STORAGE_KEYS.sms, value.toString());
                if (value) {
                  await requestSMSPermission();
                }
              }}
              trackColor={{ false: isDark ? '#444' : '#E8E8E8', true: '#FFE5E5' }}
              thumbColor={smsToggled ? '#E04848' : isDark ? '#666' : '#ffffff'}
              ios_backgroundColor={isDark ? '#444' : '#ddd'}
            />
          </View>

          {/* Contacts */}
          <View style={[styles.permRow, { backgroundColor: isDark ? "#1e1e1e" : "#FAFAFA" }]}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? "#2a1a1a" : "#FFF2F1" }]}>
              <Ionicons name="person-outline" size={21} color="#F76E64" />
            </View>
            <View style={styles.permTextBox}>
              <Text style={[styles.permTitle, { color: isDark ? "#fff" : "#000" }]}>{t('contactsAccess')}</Text>
              <Text style={[styles.permDesc, { color: isDark ? "#aaa" : "#7C7C80" }]}>
                {t('contactsAccessDesc')}
              </Text>
              <Text style={[styles.statusText, { color: getStatusColor(contactsStatus) }]}>
                {contactsToggled ? getStatusText(contactsStatus) : 'Off'}
              </Text>
            </View>
            <Switch
              value={contactsToggled}
              onValueChange={async (value) => {
                setContactsToggled(value);
                await AsyncStorage.setItem(STORAGE_KEYS.contacts, value.toString());
                if (value) {
                  await requestContactsPermission();
                }
              }}
              trackColor={{ false: isDark ? '#444' : '#E8E8E8', true: '#FFE5E5' }}
              thumbColor={contactsToggled ? '#E04848' : isDark ? '#666' : '#ffffff'}
              ios_backgroundColor={isDark ? '#444' : '#ddd'}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom section */}
      {allPermissionsGranted && isFirstLaunch ? (
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={async () => {
              const user = auth.currentUser;
              if (user?.email) {
                await AsyncStorage.setItem(
                  `permissions_completed_${user.email}`,
                  'true'
                );
              }
              router.replace('/features/SafetyFeatures');
            }}
          >
            <Text style={styles.continueButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      ) : !allPermissionsGranted ? (
        <View style={styles.bottomSection}>
          <Text style={styles.pendingText}>
            {!locationToggled && 'Enable Location permission first.'}
            {!smsToggled && locationToggled && 'Enable SMS permission first.'}
            {!contactsToggled && locationToggled && smsToggled && 'Enable Contacts permission first.'}
            {!locationToggled && smsToggled && 'Enable Location and SMS permissions first.'}
            {!locationToggled && contactsToggled && 'Enable Location and SMS permissions first.'}
            {!smsToggled && contactsToggled && 'Enable SMS permission first.'}
            {!locationToggled && !smsToggled && !contactsToggled && 'Enable all permissions to continue'}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: '5%',
    justifyContent: 'flex-start',
  },
  headerWrapper: { marginTop: 70, marginBottom: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    width: '116%',
    backgroundColor: '#E0E0E0',
    marginTop: 10,
    marginBottom: 18,
    alignSelf: 'center',
  },
  subheading: {
    color: '#7C7C80',
    fontSize: 15,
    marginBottom: 15,
  },
  permList: { flex: 1 },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 20,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 26,
    backgroundColor: '#FFF2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  permTextBox: { flex: 1 },
  permTitle: { fontSize: 16, fontWeight: '700' },
  permDesc: { fontSize: 13, color: '#7C7C80', marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  bottomSection: { alignItems: 'center', marginBottom: 20, minHeight: 80, justifyContent: 'center' },
  pendingText: {
    color: '#F76E64',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  completeContainer: {
    alignItems: 'center',
    gap: 12,
  },
  completeText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  autoNavText: {
    color: '#7C7C80',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#E04848',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});