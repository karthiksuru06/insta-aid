// utils/api.ts
import axios from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// Filter alerts based on criteria
export const filterAlerts = async (filters: any) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/alerts/filter`, filters);
    return response.data;
  } catch (error) {
    console.error("Error filtering alerts:", error);
    throw error;
  }
};

// Test connection to backend
export const testConnection = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.status === 200;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
};

// Get nearby users
export const getNearbyUsers = async (latitude: number, longitude: number, radius: number = 5) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/users/nearby`, {
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
    const response = await axios.post(`${API_BASE_URL}/alerts/emergency`, alertData);
    return response.data;
  } catch (error) {
    console.error("Error sending emergency alert:", error);
    throw error;
  }
};

// Get location alerts
export const getLocationAlerts = async (userId: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/alerts/location/${userId}`);
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
