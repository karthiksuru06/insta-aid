// services/firebaseServices.ts
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebaseConfig";

// Save alert to Firestore
export const saveAlert = async (userId: string, alertData: any) => {
  try {
    const alertRef = collection(db, "alerts");
    const docRef = await addDoc(alertRef, {
      userId,
      ...alertData,
      timestamp: Timestamp.now(),
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving alert:", error);
    throw error;
  }
};

// Get user data from Firestore
export const getUserData = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};

// Save user data to Firestore
export const saveUserData = async (userId: string, userData: any) => {
  try {
    await setDoc(doc(db, "users", userId), userData, { merge: true });
    return userData;
  } catch (error) {
    console.error("Error saving user data:", error);
    throw error;
  }
};

// Fetch alert history
export const fetchAlertHistory = async (userId?: string, limit: number = 50) => {
  try {
    const q = userId
      ? query(collection(db, "alerts"), where("userId", "==", userId))
      : query(collection(db, "alerts"));
    const querySnapshot = await getDocs(q);
    const alerts: any[] = [];
    querySnapshot.forEach((doc) => {
      alerts.push({ id: doc.id, ...doc.data() });
    });
    return alerts.slice(0, limit);
  } catch (error) {
    console.error("Error fetching alert history:", error);
    throw error;
  }
};

// Fetch live alerts
export const fetchLiveAlerts = async () => {
  try {
    const q = query(collection(db, "alerts"));
    const querySnapshot = await getDocs(q);
    const alerts: any[] = [];
    querySnapshot.forEach((doc) => {
      alerts.push({ id: doc.id, ...doc.data() });
    });
    return alerts;
  } catch (error) {
    console.error("Error fetching live alerts:", error);
    throw error;
  }
};

// Save contact form submission
export const saveContactFormSubmission = async (formData: any) => {
  try {
    const submissionsRef = collection(db, "contactSubmissions");
    const docRef = await addDoc(submissionsRef, {
      ...formData,
      status: "NEW",
      userSeen: false,
      timestamp: Timestamp.now(),
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving contact form:", error);
    throw error;
  }
};

// Get all users (for admin)
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    const users: any[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

// Update user
export const updateUser = async (userId: string, updates: any) => {
  try {
    await updateDoc(doc(db, "users", userId), updates);
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// Delete user
export const deleteUser = async (userId: string) => {
  try {
    await updateDoc(doc(db, "users", userId), { deleted: true, deletedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Get announcements
export const getAnnouncements = async () => {
  try {
    const q = query(collection(db, "announcements"));
    const querySnapshot = await getDocs(q);
    const announcements: any[] = [];
    querySnapshot.forEach((doc) => {
      announcements.push({ id: doc.id, ...doc.data() });
    });
    return announcements;
  } catch (error) {
    console.error("Error fetching announcements:", error);
    throw error;
  }
};

// Post announcement (admin)
export const postAnnouncement = async (announcement: any) => {
  try {
    const announcementsRef = collection(db, "announcements");
    const docRef = await addDoc(announcementsRef, {
      ...announcement,
      timestamp: Timestamp.now(),
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error posting announcement:", error);
    throw error;
  }
};

// Log user activity
export const logUserActivity = async (userId: string, activity: string) => {
  try {
    const activityRef = collection(db, "activities");
    await addDoc(activityRef, {
      userId,
      activity,
      timestamp: Timestamp.now(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

// Update user status and last seen (heartbeat)
export const updateUserStatus = async (userId: string, status: string) => {
  try {
    await updateDoc(doc(db, "users", userId), {
      status,
      lastSeen: Timestamp.now(),
      lastStatusUpdate: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    throw error;
  }
};

// Heartbeat to keep user marked as active
export const updateUserHeartbeat = async (userId: string) => {
  try {
    await updateDoc(doc(db, "users", userId), {
      status: "Active",
      lastSeen: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating user heartbeat:", error);
  }
};

// Assign feedback to admin
export const assignFeedback = async (feedbackId: string, adminId: string) => {
  try {
    await updateDoc(doc(db, "contactSubmissions", feedbackId), {
      assignedTo: adminId,
      status: "ASSIGNED",
    });
  } catch (error) {
    console.error("Error assigning feedback:", error);
    throw error;
  }
};

// Fetch feedbacks
export const fetchFeedbacks = async () => {
  try {
    const q = query(collection(db, "contactSubmissions"));
    const querySnapshot = await getDocs(q);
    const feedbacks: any[] = [];
    querySnapshot.forEach((doc) => {
      feedbacks.push({ id: doc.id, ...doc.data() });
    });
    return feedbacks;
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    throw error;
  }
};

// Subscribe to feedbacks (real-time updates)
export const subscribeToFeedbacks = (callback: (feedbacks: any[]) => void) => {
  try {
    const q = query(collection(db, "contactSubmissions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedbacks: any[] = [];
      snapshot.forEach((doc) => {
        feedbacks.push({ id: doc.id, ...doc.data() });
      });
      callback(feedbacks);
    }, (error) => {
      console.error("Error in feedbacks snapshot:", error);
    });
    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to feedbacks:", error);
    throw error;
  }
};

// Resolve feedback
export const resolveFeedback = async (feedbackId: string) => {
  try {
    await updateDoc(doc(db, "contactSubmissions", feedbackId), {
      status: "RESOLVED",
      resolvedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error resolving feedback:", error);
    throw error;
  }
};

// Add user (for admin)
export const addUser = async (userData: any) => {
  try {
    const usersRef = collection(db, "users");
    const docRef = await addDoc(usersRef, {
      ...userData,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding user:", error);
    throw error;
  }
};

// Fetch users
export const fetchUsers = async () => {
  return getAllUsers();
};

// Migrate user statuses
export const migrateUserStatuses = async (migrations: any[]) => {
  try {
    for (const migration of migrations) {
      await updateUserStatus(migration.userId, migration.status);
    }
    return true;
  } catch (error) {
    console.error("Error migrating statuses:", error);
    throw error;
  }
};

// Subscribe to users (real-time updates)
export const subscribeToUsers = (callback: (users: any[]) => void) => {
  try {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      callback(users);
    }, (error) => {
      console.error("Error in users snapshot:", error);
    });
    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to users:", error);
    throw error;
  }
};

export default {
  saveAlert,
  getUserData,
  saveUserData,
  fetchAlertHistory,
  fetchLiveAlerts,
  saveContactFormSubmission,
  getAllUsers,
  updateUser,
  deleteUser,
  getAnnouncements,
  postAnnouncement,
  logUserActivity,
  updateUserStatus,
  updateUserHeartbeat,
  assignFeedback,
  fetchFeedbacks,
  resolveFeedback,
  addUser,
  fetchUsers,
  migrateUserStatuses,
  subscribeToUsers,
  subscribeToFeedbacks,
};