import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Slot, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { initShakeService } from '../(lib)/ShakeService';
import { useTheme } from '../../components/ThemeContext';
import { AuthProvider } from '../../src/Contexts/AuthContexts';
import BatteryWatcher from './BatteryWatcher';

function NavIcon({
  name,
  label,
  to,
  active,
  theme,
  isAdmin = false,
}: {
  name: string;
  label: string;
  to: string;
  active?: boolean;
  theme: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const scale = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start();

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    // Only navigate if not already active
    if (!active) {
      router.push(to as any);
    }
  };

  return (
    <TouchableWithoutFeedback onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.navItem, { transform: [{ scale }] }]}>
        <Ionicons
          name={name as any}
          size={22}
          color={active ? '#ED4C4C' : theme === "dark" ? "#999" : '#666'}
        />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            active ? styles.navLabelActive : styles.navLabel,
            { color: active ? '#ED4C4C' : theme === "dark" ? "#999" : '#666' }
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

function GlobalBatteryWatcher() {
  const [batteryLowAlert, setBatteryLowAlert] = React.useState(false);
  const [locationOffAlert, setLocationOffAlert] = React.useState(false);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const battery = await AsyncStorage.getItem('batteryLowAlert');
        const location = await AsyncStorage.getItem('locationOffAlert');
        setBatteryLowAlert(battery === 'true');
        setLocationOffAlert(location === 'true');
      } catch (error) {
        console.log('Error loading alert settings:', error);
      }
    };
    loadSettings();
  }, []);

  return (
    <BatteryWatcher
      batteryLowAlert={batteryLowAlert}
      locationOffAlert={locationOffAlert}
      simulateFivePercentDrop
    />
  );
}

export default function Layout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();

  // Normalize path for reliable comparisons (case-insensitive, trim trailing slashes)
  const normalizedPath = (pathname || '')
    .toLowerCase()
    .replace(/\/+$/, '');

  console.log('� [LAYOUT] Current path:', pathname, 'Normalized:', normalizedPath);

  const isAdminPage = normalizedPath.startsWith('/admin');

  // Whitelist: only show the bottom nav bar on these 4 main tab pages
  const MAIN_TABS = ['/homepage', '/contactsscreen', '/numbers', '/settings'];
  const showNavBar = isAdminPage || MAIN_TABS.some(tab => normalizedPath.startsWith(tab));

  const adminTabs = [
    { name: 'bar-chart-outline', label: t('analytics') || 'Analytics', to: '/Admindashboard' },
    { name: 'people-outline', label: t('users') || 'Users', to: '/Adminusermanagement' },
    { name: 'call-outline', label: t('emergency') || 'Emergency', to: '/Adminemergency' },
    { name: 'alert-circle-outline', label: 'Alerts', to: '/AdminAlertsManagement' },
    { name: 'headset-outline', label: t('support') || 'Support', to: '/Adminsupport&feedback' },
  ];

  const userTabs = [
    { name: 'home-outline', label: t('home'), to: '/Homepage' },
    { name: 'people-outline', label: t('contacts'), to: '/ContactsScreen' },
    { name: 'call-outline', label: t('numbers'), to: '/Numbers' },
    { name: 'settings-outline', label: t('settings'), to: '/Settings' },
  ];

  // Dynamic navbar height (base + bottom inset)
  const NAVBAR_BASE_HEIGHT = 70;
  const navBarHeight = NAVBAR_BASE_HEIGHT + insets.bottom;

  const tabsToRender = isAdminPage ? adminTabs : userTabs;

  React.useEffect(() => {
    initShakeService().catch(e => console.warn('initShakeService failed', e));
  }, []);

  return (
    <AuthProvider>
      <View style={styles.container}>
        <View style={styles.content}>
          <Slot />
        </View>
        {/* Shake service initialized on mount (no visual element) */}
        <GlobalBatteryWatcher />



        {/* Show nav bar only on main tab pages */}
        {showNavBar && (
          <View
            style={[
              {
                flexDirection: 'row',
                justifyContent: 'space-around',
                alignItems: 'center',
                height: 70,
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: theme === "dark" ? "#1a1a1a" : '#fff',
                paddingBottom: insets.bottom,
                paddingTop: 8,
              },
            ]}
          >
            {tabsToRender.map((tab) => {
              const tabPath = tab.to.toLowerCase().replace(/\/+$/, '');
              const isActive = normalizedPath.startsWith(tabPath);
              return (
                <NavIcon
                  key={tab.name}
                  name={tab.name}
                  label={tab.label}
                  to={tab.to}
                  active={isActive}
                  theme={theme}
                  isAdmin={isAdminPage}
                />
              );
            })}
          </View>
        )}
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },

  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    fontSize: 11,
    color: '#ED4C4C',
    marginTop: 4,
    fontWeight: '700',
  },
});
