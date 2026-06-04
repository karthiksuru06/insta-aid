import axios from "axios";
import { auth } from "../firebaseConfig";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? "http://10.0.2.2:5000/api" : "https://instaaid-backend.onrender.com/api");

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically attach Firebase token to requests
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Filter alerts based on criteria
export const filterAlerts = async (filters: any) => {
  try {
    const response = await apiClient.post(`/alerts/filter`, filters);
    return response.data;
  } catch (error) {
    console.error("Error filtering alerts:", error);
    throw error;
  }
};

// Test connection to backend
export const testConnection = async () => {
  try {
    const response = await apiClient.get(`/test`);
    return response.status === 200;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
};

// Get nearby users
export const getNearbyUsers = async (latitude: number, longitude: number, radius: number = 5) => {
  try {
    const response = await apiClient.get(`/users/nearby`, {
      params: { latitude, longitude, radius },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching nearby users:", error);
    throw error;
  }
};

// Send emergency alert
export const sendEmergencyAlert = async (alertData: any) => {
  try {
    const response = await apiClient.post(`/alerts/emergency`, alertData);
    return response.data;
  } catch (error) {
    console.error("Error sending emergency alert:", error);
    throw error;
  }
};

// Get location alerts
export const getLocationAlerts = async (userId: string) => {
  try {
    const response = await apiClient.get(`/alerts/location/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching location alerts:", error);
    throw error;
  }
};

export default {
  filterAlerts,
  testConnection,
  getNearbyUsers,
  sendEmergencyAlert,
  getLocationAlerts,
};
