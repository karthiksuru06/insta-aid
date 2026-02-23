import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useAnnouncements } from '../contexts/AnnouncementContext';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function AnnouncementModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { announcements, markRead, markAllRead } = useAnnouncements();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (visible) {
      markAllRead();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: isDark ? '#1E1E1E' : '#fff' }]}>
          <View style={[styles.header, { borderColor: isDark ? '#333' : '#eee' }]}>
            <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>{t('announcements')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={isDark ? '#fff' : '#007AFF'} />
            </TouchableOpacity>
          </View>

          {announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ color: isDark ? '#aaa' : '#666' }}>{t('noAnnouncements') || 'No announcements'}</Text>
            </View>
          ) : (
            <FlatList
              data={announcements}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => markRead(item.id)}
                  style={[
                    styles.item,
                    { borderColor: isDark ? '#333' : '#f1f1f1' },
                    item.read ? { backgroundColor: isDark ? '#111' : '#fafafa' } : { backgroundColor: isDark ? '#222' : '#fff' }
                  ]}
                >
                  <Text style={[styles.itemTitle, { color: isDark ? '#fff' : '#000' }]}>{item.title}</Text>
                  <Text numberOfLines={3} style={[styles.itemBody, { color: isDark ? '#ccc' : '#444' }]}>{item.body}</Text>
                  <Text style={[styles.date, { color: isDark ? '#666' : '#999' }]}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '90%', maxHeight: '80%', borderRadius: 12, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  item: { padding: 16, borderBottomWidth: 1 },
  itemTitle: { fontWeight: '600', marginBottom: 4, fontSize: 16 },
  itemBody: { fontSize: 14, lineHeight: 20 },
  date: { fontSize: 12, marginTop: 8, alignSelf: 'flex-end' },
  emptyContainer: { padding: 20, alignItems: 'center', justifyContent: 'center' }
});
