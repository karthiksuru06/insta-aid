import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';

export default function ChatHelpButton() {
  const router = useRouter();
  const { theme } = useTheme();

  const bgColor = theme === 'dark' ? '#ED4C4C' : '#ED4C4C';
  const iconColor = '#fff';

  const pathname = usePathname();
  const normalized = (pathname || '').toLowerCase().replace(/\/+$/, '');

  // Debug if needed: console.log('💬 [ChatHelpButton] Path:', pathname, 'Normalized:', normalized);

  const isAdminPath = normalized.includes('admin') || pathname?.includes('Admin');
  const isAuthPath = normalized.startsWith('/auth') || normalized.includes('login') || normalized.includes('signup') || normalized.includes('splashscreen');
  const isChatPath = normalized.startsWith('/chat') || normalized.includes('live-chat');

  const hiddenPages = [
    'notifications', 'fakecall', 'locationpage', 'profile', 'editprofile',
    'language', 'safetyfeatures', 'enablepermissions', 'alertsandbackup', 'contactsscreen'
  ];

  const isHiddenPage = hiddenPages.some(page => normalized.includes(page));

  if (isAdminPath || isAuthPath || isChatPath || isHiddenPage) {
    return null;
  }

  const handlePress = () => {
    // Navigate directly to the live chat screen
    try {
      router.push('/chat/live-chat');
    } catch (e) {
      router.push('chat/live-chat');
    }
  };

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <TouchableOpacity
        accessibilityLabel="Help chat"
        accessibilityHint="Opens support chat"
        activeOpacity={0.85}
        onPress={handlePress}
        style={[styles.button, { backgroundColor: bgColor }]}
      >
        <Ionicons name="chatbubble-ellipses" size={22} color={iconColor} />
      </TouchableOpacity>
      <Text style={[styles.tooltip, theme === 'dark' ? styles.tooltipDark : styles.tooltipLight]}>Need help?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'ios' ? 80 : 72,
    alignItems: 'center',
    zIndex: 9999,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  tooltip: {
    marginTop: 6,
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tooltipLight: {
    backgroundColor: '#fff',
    color: '#333',
  },
  tooltipDark: {
    backgroundColor: '#111',
    color: '#fff',
  },
});