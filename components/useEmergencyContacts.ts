import { Alert } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { useTranslation } from 'react-i18next';

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

            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
                await SMS.sendSMSAsync(contacts, message);
                Alert.alert(t('alerts.emergencyAlert'), t('alerts.locationShared'));
                await logAlert('motion_shake', { coords, contacts });
            } else {
                Alert.alert(t('alerts.error'), t('alerts.smsNotAvailableOnDevice'));
            }
        } catch (err) {
            console.warn('Emergency SMS error', err);
            Alert.alert(t('alerts.error'), t('alerts.failedToGetLocationOrSendSMS'));
        }
    };

    return { getEmergencyContacts, logAlert, sendEmergencySMS };
};
