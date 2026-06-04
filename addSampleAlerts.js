const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "instaaid-43394.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "instaaid-43394",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "instaaid-43394.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "181830039349",
  appId: process.env.FIREBASE_APP_ID || "1:181830039349:web:362845743f479d63e6be7c",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-PW40B42Q6X",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addSampleAlerts() {
  const sampleAlerts = [
    {
      title: "Location Sharing Alert",
      description: "User shared location unexpectedly",
      location: "Downtown Area",
      user: "john.doe@example.com",
      type: "location_sharing",
      severity: "Medium",
      status: "New",
      department: "Security",
      latitude: 40.7128,
      longitude: -74.0060,
    },
    {
      title: "Motion Sensor False Alarm",
      description: "Motion detected in restricted area",
      location: "Warehouse Section B",
      user: "jane.smith@example.com",
      type: "motion_sensor_false_alarm",
      severity: "Low",
      status: "Acknowledged",
      department: "Operations",
      latitude: 40.7589,
      longitude: -73.9851,
    },
    {
      title: "Instant Aid Request",
      description: "Emergency assistance needed",
      location: "Central Park",
      user: "emergency.user@example.com",
      type: "instant_aid",
      severity: "Critical",
      status: "Resolved",
      department: "Emergency Services",
      latitude: 40.7829,
      longitude: -73.9654,
      nearbyUsers: ["user1", "user2", "user3"],
    },
  ];

  try {
    for (const alert of sampleAlerts) {
      const docRef = await addDoc(collection(db, "alerts"), {
        ...alert,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      console.log("Alert added with ID: ", docRef.id);
    }
    console.log("All sample alerts added successfully!");
  } catch (error) {
    console.error("Error adding alerts: ", error);
  }
}

addSampleAlerts();
