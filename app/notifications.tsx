import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../components/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { auth, db } from '../utils/firebaseConfig';


export default function NotificationsScreen() {
  const { unreadCount, clearAllNotifications, markAllAsRead } = useNotifications();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<any[]>([]);
  const router = useRouter();

  // Custom Alert State
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[];
  }>({ visible: false, title: '', message: '', buttons: [] });

  const showAlert = (title: string, message: string, buttons: any[] = [{ text: 'OK' }]) => {
    setCustomAlert({ visible: true, title, message, buttons });
  };

  const closeAlert = () => {
    setCustomAlert(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    markAllAsRead();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setAlerts([]);
      return;
    }

    const q = query(
      collection(db, 'alerts'),
      where('userId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => {
        const ta = a.createdAt ? a.createdAt.toMillis?.() ?? a.createdAt : 0;
        const tb = b.createdAt ? b.createdAt.toMillis?.() ?? b.createdAt : 0;
        return tb - ta;
      });
      setAlerts(docs);
    }, (error) => {
      console.warn('NotificationsScreen: error loading alerts', error);
      setAlerts([]);
    });

    return () => unsub();
  }, []);

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'alerts', id));
    } catch (error) {
      console.warn('Error deleting notification:', error);
    }
  };

  const handleClearAll = () => {
    console.log('Handle Clear All Pressed. Theme:', theme);
    if (alerts.length === 0) {
      showAlert(t('alerts.noNotifications'), t('alerts.noNotificationsToClear'));
      return;
    }

    showAlert(
      t('alerts.clearAllNotifications'),
      t('alerts.clearAllConfirm', { count: alerts.length }),
      [
        { text: t('cancel'), style: 'cancel', onPress: closeAlert },
        {
          text: t('alerts.clearAll'),
          style: 'destructive',
          onPress: async () => {
            try {
              closeAlert(); // Close first
              await clearAllNotifications();
              setTimeout(() => { // Small delay to allow modal to close before showing success
                showAlert(t('success'), t('alerts.allCleared'));
              }, 300);
            } catch (error) {
              closeAlert();
              setTimeout(() => {
                showAlert(t('error'), t('alerts.failedToClear'));
              }, 300);
              console.warn('Error clearing notifications:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme === 'dark' ? '#000' : '#fff' }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ================= HEADER ================= */}
      <View style={[
        styles.header,
        {
          backgroundColor: theme === 'dark' ? '#000' : '#fff',
          borderColor: theme === 'dark' ? '#333' : '#eaeaea'
        }
      ]}>

        {/* Back */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}   // ✅ WORKING BACK
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={theme === 'dark' ? '#fff' : '#111'}
          />
        </TouchableOpacity>

        {/* Title */}
        <View style={{ flex: 1, paddingHorizontal: 4 }}>
          <Text
            style={[
              styles.headerTitle,
              { color: theme === 'dark' ? '#fff' : '#000' }
            ]}
            numberOfLines={1}
          >
            {t('notificationsPage')}
          </Text>
        </View>

        {/* Clear */}
        {alerts.length > 0 ? (
          <TouchableOpacity
            onPress={handleClearAll}   // ✅ WORKING CLEAR
            style={styles.clearBtn}
          >
            <Text
              style={[styles.clearText, { color: theme === 'dark' ? '#0A84FF' : '#1E88E5' }]}
              numberOfLines={1}
            >
              {t('alerts.clearAll')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

      </View>


      {/* ================= BODY ================= */}
      <View style={styles.body}>
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={42}
              color={theme === 'dark' ? '#555' : '#bbb'}
            />
            <Text style={[styles.emptyText, { color: theme === 'dark' ? '#aaa' : '#777' }]}>
              {t('alerts.noNotifications')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={alerts}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.alertItem,
                  { backgroundColor: theme === 'dark' ? '#111' : '#f9f9f9' }
                ]}
              >
                <View style={styles.titleRow}>
                  <View style={styles.textContainer}>
                    <Text
                      style={[
                        styles.alertTitle,
                        { color: theme === 'dark' ? '#fff' : '#111' }
                      ]}
                    >
                      {item.title || t('alert')}
                    </Text>

                    {item.type && (
                      <View style={[styles.typeBadge, { backgroundColor: theme === 'dark' ? '#333' : '#EEF3FF' }]}>
                        <Text style={[styles.typeText, { color: theme === 'dark' ? '#AAA' : '#1E3A8A' }]}>{String(item.type)}</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity onPress={() => handleDeleteNotification(item.id)}>
                    <Ionicons
                      name="close"
                      size={18}
                      color={theme === 'dark' ? '#aaa' : '#444'}
                    />
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    styles.alertBody,
                    { color: theme === 'dark' ? '#ccc' : '#666' }
                  ]}
                >
                  {item.description || item.body || ''}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      {/* CUSTOM THEMED ALERT MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={customAlert.visible}
        onRequestClose={closeAlert}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme === 'dark' ? '#222' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: theme === 'dark' ? '#fff' : '#000' }]}>
              {customAlert.title}
            </Text>
            <Text style={[styles.modalMessage, { color: theme === 'dark' ? '#ccc' : '#444' }]}>
              {customAlert.message}
            </Text>
            <View style={styles.modalButtons}>
              {customAlert.buttons.map((btn, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    if (btn.onPress) btn.onPress();
                    else closeAlert();
                  }}
                  style={[
                    styles.modalBtn,
                    btn.style === 'destructive' ? { backgroundColor: '#FF3B30' } :
                      { backgroundColor: theme === 'dark' ? '#333' : '#F0F0F0' }
                  ]}
                >
                  <Text style={[
                    styles.modalButtonText,
                    btn.style === 'destructive' ? { color: '#FFF' } :
                      btn.style === 'cancel' ? { color: theme === 'dark' ? '#aaa' : '#666' } :
                        { color: theme === 'dark' ? '#fff' : '#000' }
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* HEADER */
  header: {
    height: 80,                 // ⬅️ bigger header
    paddingHorizontal: 16,
    paddingTop: 26,             // ⬅️ header kindaki move
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.6,
    borderColor: '#eaeaea',
    elevation: 2,               // ⬅️ slight shadow (Android)
    shadowColor: '#000',        // ⬅️ iOS shadow
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  backBtn: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 21,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },

  clearBtn: {
    minWidth: 42,
    maxWidth: 150,              // ⬅️ prevent it from eating the whole header
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  clearText: {
    fontSize: 13,               // ⬅️ slightly smaller for Tamil/Malayalam
    fontWeight: '700',
    color: '#1E88E5',
  },

  /* BODY */
  body: { flex: 1, padding: 16 },

  alertItem: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 0.6,
    borderColor: '#eee',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8
  },

  textContainer: {
    flex: 1,
    flexDirection: 'column'
  },

  alertTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4
  },

  alertBody: {
    marginTop: 4,
    lineHeight: 20,
    fontSize: 14
  },

  typeBadge: {
    backgroundColor: '#EEF3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginTop: 4
  },

  typeText: {
    fontSize: 11,
    color: '#1E3A8A',
    fontWeight: '600'
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },

  /* MODAL */
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    width: '82%',
    padding: 24,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'column',    // ⬅️ Stacked for long text safety
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  modalButtonText: {
    fontSize: 15,               // ⬅️ Better fit
    fontWeight: '700',
  },
});