import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';

export default function NotificationButton({ color = '#FFF' }: { color?: string }) {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  return (
    <Pressable
      accessibilityLabel="Open notifications"
      onPress={() => router.push('/notifications')}
      style={styles.container}
    >
      <Ionicons name="notifications-outline" size={24} color={color} />
      {unreadCount > 0 && <View style={styles.badge} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
  },
});
