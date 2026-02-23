import * as Notifications from "expo-notifications";
import { onAuthStateChanged } from "firebase/auth"; // <-- THIS IS CORRECT
import { addDoc, collection, doc, getDocs, onSnapshot, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { auth, db } from "../firebaseConfig";

import { Platform, Vibration } from 'react-native';

interface NotificationContextType {
  isDangerMode: boolean;
  unreadCount: number;
  startDangerNotifications: () => void;
  stopDangerNotifications: () => void;
  markAllAsRead: () => Promise<void>;
  sendSafeNotification: () => void;
  clearAllNotifications: () => Promise<void>;
  logNotification: (type: string, title: string, description: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isDangerMode, setIsDangerMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const notificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Configure notification handler to show alerts in foreground
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }, []);

  // Request notification permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Notification permission not granted');
        }
      } catch (error) {
        console.warn('Error requesting notification permissions:', error);
      }
    };

    requestPermissions();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsub();
  }, []);

  // Track unread notifications for the current user
  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }
    const q = query(collection(db, "alerts"), where("userId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const unreadAlerts = snap.docs.filter(doc => {
          const read = doc.data().read;
          return read === false || read === undefined;
        });
        setUnreadCount(unreadAlerts.length);
      },
      (error) => {
        console.warn("NotificationContext: unreadCount listener error", error);
        setUnreadCount(0);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  const startDangerNotifications = () => {
    // Stop any existing notifications first
    stopDangerNotifications();

    setIsDangerMode(true);

    // Show notification immediately
    (async () => {
      try {
        // Immediate vibration call for urgency
        Vibration.vibrate([0, 500, 200, 500]);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🚨 YOU ARE IN DANGER!",
            body: "Emergency alert active. Click 'I AM SAFE' if you are okay.",
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500, 200, 500],
          },
          trigger: null,
        });

        // Set up interval to show notification every 2 seconds
        notificationIntervalRef.current = setInterval(async () => {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "🚨 YOU ARE IN DANGER!",
                body: "Emergency alert active. Click 'I AM SAFE' if you are okay.",
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
                vibrate: [0, 500, 200, 500],
              },
              trigger: null,
            });
          } catch (e) {
            console.warn('Notification error (interval):', e);
          }
        }, 2000);
      } catch (e) {
        console.warn('Failed to schedule danger notification:', e);
      }
    })();
  };

  const stopDangerNotifications = () => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }
    // Cancel any scheduled notifications and dismiss delivered ones
    Notifications.cancelAllScheduledNotificationsAsync().catch((e) => console.warn('cancel scheduled error', e));
    // Dismiss delivered notifications where supported
    if (Notifications.dismissAllNotificationsAsync) {
      // @ts-ignore - some SDK versions may not have this defined in types
      Notifications.dismissAllNotificationsAsync().catch((e) => console.warn('dismiss notifications error', e));
    }

    setIsDangerMode(false);
  };

  const markAllAsRead = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(collection(db, "alerts"),
        where("userId", "==", user.uid)
      );

      const snap = await getDocs(q);
      const unreadDocs = snap.docs.filter(d => d.data().read === false || d.data().read === undefined);

      if (unreadDocs.length === 0) return;

      console.log("📝 Marking", unreadDocs.length, "alerts as read");

      const batch = writeBatch(db);
      unreadDocs.forEach((alertDoc) => {
        batch.update(doc(db, "alerts", alertDoc.id), { read: true });
      });

      await batch.commit();
      setUnreadCount(0);
    } catch (error) {
      console.warn("Error marking notifications as read:", error);
    }
  };

  const sendSafeNotification = async () => {
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ YOU ARE SAFE",
          body: "Your status has been updated to safe.",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Failed to send safe notification', e);
    }
  };

  // Clear all notifications for the current user
  const clearAllNotifications = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(collection(db, "alerts"), where("userId", "==", user.uid));
      const snap = await getDocs(q);

      if (snap.empty) {
        console.log("No notifications to clear");
        return;
      }

      console.log("🗑️ Deleting", snap.docs.length, "alerts for user");

      const batch = writeBatch(db);
      snap.docs.forEach((alertDoc) => {
        batch.delete(doc(db, "alerts", alertDoc.id));
      });

      await batch.commit();
      setUnreadCount(0);
      console.log("✅ All notifications cleared");
    } catch (error) {
      console.warn("Error clearing notifications:", error);
      throw error;
    }
  };

  useEffect(() => {
    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, []);

  // Helper function to log any notification type
  const logNotification = async (type: string, title: string, description: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await addDoc(collection(db, 'alerts'), {
        userId: user.uid,
        type,
        title,
        description,
        timestamp: serverTimestamp(),
        read: false,
      });
    } catch (error) {
      console.warn("Error logging notification:", error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{ isDangerMode, unreadCount, startDangerNotifications, stopDangerNotifications, markAllAsRead, sendSafeNotification, clearAllNotifications, logNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
};
