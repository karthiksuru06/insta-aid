import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getShakeDetectionState } from '../../contexts/ShakeDetectionContext';
import { shakeEventEmitter } from '../../contexts/ShakeEventEmitter';
import { auth, db } from '../../firebaseConfig';

let isProcessing = false;

const getEmergencyContacts = async (uid: string): Promise<string[]> => {
    try {
        const userDocRef = doc(db, 'users', uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) return [];
        const data = snap.data() as any;
        return (data.emergencyContacts ?? [])
            .map((c: any) => c.phone)
            .filter(Boolean);
    } catch (err) {
        console.warn('[ShakeService] Get contacts error', err);
        return [];
    }
};

const logAlert = async (type: string, details: any = {}) => {
    try {
        const user = auth.currentUser;
        if (!user) return;
        await addDoc(collection(db, 'alerts'), {
            userId: user.uid,
            type,
            details,
            timestamp: serverTimestamp(),
        });
    } catch (e) {
        console.warn('[ShakeService] Log error', e);
    }
};

export const sendEmergencySMSFromBackground = async () => {
    if (isProcessing) return;

    try {
        isProcessing = true;

        const isEnabled = await getShakeDetectionState();
        if (!isEnabled) {
            shakeEventEmitter.emit('shakeDetectedButDisabled');
            return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const contacts = await getEmergencyContacts(currentUser.uid);
        if (contacts.length === 0) return;

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        const message = `🚨 EMERGENCY! I need help! My live location: ${locationUrl}`;

        try {
            // CRITICAL: Safe require with null check
            const mod = require('../../modules/background-shake');
            const BackgroundShake = mod?.default;
            const { PermissionsAndroid, Platform } = require('react-native');

            if (!BackgroundShake || typeof BackgroundShake.sendSMS !== 'function') {
                console.warn('[ShakeService] Native module unavailable. Falling back to Expo SMS.');
                throw new Error('Native module unavailable');
            }

            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.SEND_SMS
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.warn('[ShakeService] SMS permission denied');
                    return;
                }
            }

            await BackgroundShake.sendSMS(contacts.join(','), message);
            await logAlert('motion_shake', { latitude, longitude, contacts });
        } catch (e) {
            console.warn('[ShakeService] Silent SMS failed, falling back to Expo SMS', e);
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
                await SMS.sendSMSAsync(contacts, message);
            }
        }
    } catch (err) {
        console.warn('[ShakeService] SMS error', err);
    } finally {
        isProcessing = false;
    }
};

export const initShakeService = async () => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('[ShakeService] Initialized with status:', status);
    } catch (err) {
        console.warn('[ShakeService] Init error', err);
    }
};

// SAFE: No top-level execution. Called explicitly in app/(tabs)/_layout.tsx