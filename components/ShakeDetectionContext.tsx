import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform } from 'react-native';
import { auth, db } from '../firebaseConfig';

const SHAKE_THRESHOLD = 2.0;
const ACCELEROMETER_UPDATE_INTERVAL = 300;
const SHAKE_RESET_INTERVAL = 5000;

type ShakeContextType = {
	isShakeDetectionOn: boolean;
	setIsShakeDetectionOn: (v: boolean) => void;
};

const ShakeDetectionContext = createContext<ShakeContextType | undefined>(undefined);

export const ShakeDetectionProvider = ({ children }: { children: React.ReactNode }) => {
	const { t } = useTranslation();
	const [isShakeDetectionOn, setIsShakeDetectionOnState] = useState<boolean>(false);

	const shakeCountRef = useRef<number>(0);
	const shakeTimeoutRef = useRef<number | null>(null);

	// load persisted toggle
	useEffect(() => {
		(async () => {
			try {
				const v = await AsyncStorage.getItem('shakeDetectionEnabled');
				if (v !== null) setIsShakeDetectionOnState(v === 'true');
			} catch (e) {
				console.warn('load shake setting', e);
			}
		})();
	}, []);

	// persist toggle
	useEffect(() => {
		(async () => {
			try {
				await AsyncStorage.setItem('shakeDetectionEnabled', isShakeDetectionOn.toString());
			} catch (e) {
				console.warn('save shake setting', e);
			}
		})();
	}, [isShakeDetectionOn]);

	const setIsShakeDetectionOn = (v: boolean) => {
		setIsShakeDetectionOnState(v);
	};

	const getEmergencyContacts = async (uid: string): Promise<string[]> => {
		const userDocRef = doc(db, 'users', uid);
		const snap = await getDoc(userDocRef);
		if (!snap.exists()) return [];
		const data = snap.data() as any;
		return (data.emergencyContacts ?? []).map((c: any) => c.phone).filter(Boolean);
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
			if (contacts.length === 0) return;

			const { status: locStatus } = await Location.getForegroundPermissionsAsync();
			let locationUrl = "";
			if (locStatus === 'granted') {
				const loc = await Location.getCurrentPositionAsync({});
				locationUrl = ` https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
			}

			const message = `🚨 EMERGENCY! I need help!${locationUrl}`;

			const BackgroundShake = require('../modules/background-shake').default;
			const { PermissionsAndroid, Platform } = require('react-native');

			if (Platform.OS === 'android') {
				const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS);
				if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
			}

			await BackgroundShake.sendSMS(contacts.join(','), message);
			await logAlert('manual_sos', { contacts, hasLocation: !!locationUrl });
		} catch (e) {
			console.warn('Manual silent SMS failed', e);
		}
	};

	// Global accelerometer listener native offloading
	useEffect(() => {
		if (Platform.OS === 'web') return;

		(async () => {
			if (isShakeDetectionOn) {
				const currentUser = auth.currentUser;
				if (!currentUser) return;
				const contacts = await getEmergencyContacts(currentUser.uid);
				if (contacts.length === 0) {
					Alert.alert(t('alerts.noContacts'), t('alerts.addEmergencyContacts'));
					// revert toggle
					setIsShakeDetectionOnState(false);
					return;
				}

				const { status: locStatus } = await Location.requestForegroundPermissionsAsync();

				// Optional: Request Notification permission for Android 13+
				if (Platform.OS === 'android' && Platform.Version >= 33) {
					const { PermissionsAndroid } = require('react-native');
					await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
				}

				// Optional: Request Background Location if we want the most accurate link in background
				await Location.requestBackgroundPermissionsAsync();

				// Start Native Background Shake Service
				try {
					const BackgroundShake = require('../modules/background-shake').default;
					BackgroundShake.startService(
						contacts.join(','),
						"🚨 EMERGENCY ALERT! I need help!"
					);
					console.log('[ShakeDetectionContext] Native background service started');
				} catch (e) {
					console.warn('Failed to start BackgroundShake native service.', e);
				}

			} else {
				// Stop the service
				try {
					const BackgroundShake = require('../modules/background-shake').default;
					BackgroundShake.stopService();
				} catch (e) {
					// Ignore
				}
			}
		})();

		return () => {
			// Cleanup if needed
		};
	}, [isShakeDetectionOn, t]);

	return (
		<ShakeDetectionContext.Provider value={{ isShakeDetectionOn, setIsShakeDetectionOn }}>
			{children}
		</ShakeDetectionContext.Provider>
	);
};

export const useShakeDetection = () => {
	const ctx = useContext(ShakeDetectionContext);
	if (!ctx) throw new Error('useShakeDetection must be used inside ShakeDetectionProvider');
	return ctx;
};
