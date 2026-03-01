import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { auth, db } from '../firebaseConfig';

export const useEmergencyContacts = () => {
    const { t } = useTranslation();

    const getEmergencyContacts = async (uid: string): Promise<string[]> => {
        const userDocRef = doc(db, 'users', uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) return [];
        const data = snap.data() as any;
        return (data.emergencyContacts ?? [])
            .map((c: any) => c.phone)
            .filter(Boolean);
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
            console.warn('Failed to log alert', e);
            Alert.alert(t('alerts.loggingError'), t('alerts.failedToLogAlert'));
        }
    };

    const sendEmergencySMS = async (): Promise<void> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const contacts = await getEmergencyContacts(currentUser.uid);
            if (contacts.length === 0) {
                Alert.alert(t('alerts.noContacts'), t('alerts.addEmergencyContacts'));
                return;
            }

            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('alerts.permissionError'), t('alerts.locationPermissionRequired'));
                return;
            }

            const { coords } = await Location.getCurrentPositionAsync({});
            const locationUrl = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
            const message = `🚨 EMERGENCY! I need help! My live location: ${locationUrl}`;

            try {
                const BackgroundShake = require('../modules/background-shake').default;
                const { PermissionsAndroid, Platform } = require('react-native');

                if (Platform.OS === 'android') {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.SEND_SMS
                    );
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        Alert.alert(t('alerts.permissionError'), t('alerts.smsPermissionRequired'));
                        return;
                    }
                }

                await BackgroundShake.sendSMS(contacts.join(','), message);
                Alert.alert(t('alerts.emergencyAlert'), t('alerts.locationShared'));
                await logAlert('motion_shake', { coords, contacts });
            } catch (e) {
                console.warn('Silent SMS failed, falling back or failing', e);
                // Optional: Fallback to expo-sms if native fails
                const isAvailable = await SMS.isAvailableAsync();
                if (isAvailable) {
                    await SMS.sendSMSAsync(contacts, message);
                }
            }
        } catch (err) {
            console.warn('Emergency SMS error', err);
            Alert.alert(t('alerts.error'), t('alerts.failedToGetLocationOrSendSMS'));
        }
    };

    return { getEmergencyContacts, logAlert, sendEmergencySMS };
};
