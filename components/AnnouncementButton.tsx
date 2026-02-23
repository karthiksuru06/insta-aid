import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAnnouncements } from '../contexts/AnnouncementContext';
import AnnouncementModal from './AnnouncementModal';

export default function AnnouncementButton({ color = '#FFF' }: { color?: string }) {
  const [open, setOpen] = useState(false);
  const { hasUnread, fetchAnnouncements } = useAnnouncements();
  const onOpen = async () => {
    await fetchAnnouncements();
    setOpen(true);
  };

  return (
    <>
      <Pressable onPress={onOpen} accessibilityLabel="Open announcements" style={styles.container}>
        <Ionicons name="megaphone-outline" size={24} color={color} />
        {hasUnread && <View style={styles.badge} />}
      </Pressable>
      <AnnouncementModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9500',
  },
});
