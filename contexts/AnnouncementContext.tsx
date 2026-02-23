import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';

interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt?: string;
  read?: boolean;
}

interface AnnouncementContextType {
  announcements: Announcement[];
  hasUnread: boolean;
  fetchAnnouncements: () => Promise<void>;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

export const AnnouncementProvider = ({ children }: { children: ReactNode }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);

  // Load read announcements from AsyncStorage on mount
  useEffect(() => {
    const loadReadAnnouncements = async () => {
      try {
        const stored = await AsyncStorage.getItem('readAnnouncementIds');
        if (stored) {
          setReadIds(JSON.parse(stored));
        }
      } catch (error) {
        console.warn('Error loading read announcements:', error);
      }
    };
    loadReadAnnouncements();
  }, []);

  // Helper function to check if announcement is within 7 days
  const isWithin7Days = (createdAtString: string): boolean => {
    try {
      const createdAt = new Date(createdAtString);
      const now = new Date();
      const diffInMs = now.getTime() - createdAt.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
      return diffInDays <= 7;
    } catch (e) {
      console.warn('Error checking announcement age:', e);
      return true; // Keep announcements if date parsing fails
    }
  };

  const fetchAnnouncements = async () => {
    try {
      // Try to fetch from Firestore announcements collection
      onSnapshot(
        collection(db, 'announcements'),
        (snapshot) => {
          const data = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              title: doc.data().title ?? '',
              body: doc.data().body ?? '',
              createdAt: doc.data().createdAt ?? '',
              read: readIds.includes(doc.id), // Use persisted read status
            }))
            // Filter announcements to show only those within 7 days
            .filter((announcement) => isWithin7Days(announcement.createdAt));
          
          setAnnouncements(data);
        },
        (error) => {
          console.warn('fetchAnnouncements error from Firestore:', error);
          // Set empty announcements on error to prevent infinite retry
          setAnnouncements([]);
        }
      );
    } catch (e) {
      console.warn('fetchAnnouncements error', e);
      setAnnouncements([]);
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchAnnouncements();
      } else {
        setAnnouncements([]);
      }
    });
    return () => unsubAuth();
  }, [readIds]);

  const markAllRead = async () => {
    const newReadIds = announcements.map((a) => a.id);
    setReadIds(newReadIds);
    setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));
    // Persist to AsyncStorage
    try {
      await AsyncStorage.setItem('readAnnouncementIds', JSON.stringify(newReadIds));
    } catch (error) {
      console.warn('Error saving read announcements:', error);
    }
  };

  const markRead = async (id: string) => {
    const newReadIds = [...readIds, id];
    setReadIds(newReadIds);
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    // Persist to AsyncStorage
    try {
      await AsyncStorage.setItem('readAnnouncementIds', JSON.stringify(newReadIds));
    } catch (error) {
      console.warn('Error saving read announcements:', error);
    }
  };

  const hasUnread = announcements.some((a) => !a.read);

  return (
    <AnnouncementContext.Provider value={{ announcements, hasUnread, fetchAnnouncements, markAllRead, markRead }}>
      {children}
    </AnnouncementContext.Provider>
  );
};

export const useAnnouncements = () => {
  const ctx = useContext(AnnouncementContext);
  if (!ctx) throw new Error('useAnnouncements must be used within AnnouncementProvider');
  return ctx;
};
