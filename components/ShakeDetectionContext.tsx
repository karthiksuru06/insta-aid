import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

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

	// Global accelerometer listener
	useEffect(() => {
		if (Platform.OS === 'web') return;

		(async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== 'granted') {
					// we don't forcibly disable the toggle here, just log
					console.warn('Location permission not granted for shake detection');
				}
			} catch (e) {
				console.warn('request location perm error', e);
			}
		})();

		Accelerometer.setUpdateInterval(ACCELEROMETER_UPDATE_INTERVAL);

		const sub = Accelerometer.addListener((data) => {
			const totalForce = Math.abs(data.x) + Math.abs(data.y) + Math.abs(data.z);
			if (totalForce > SHAKE_THRESHOLD) {
				shakeCountRef.current += 1;
				if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);

				shakeTimeoutRef.current = setTimeout(() => {
					shakeCountRef.current = 0;
				}, SHAKE_RESET_INTERVAL) as unknown as number;

				if (shakeCountRef.current >= 3) {
					shakeCountRef.current = 0;
					if (shakeTimeoutRef.current) {
						clearTimeout(shakeTimeoutRef.current);
						shakeTimeoutRef.current = null;
					}

					// Double-check persisted toggle before sending
					(async () => {
						try {
							const enabled = await AsyncStorage.getItem('shakeDetectionEnabled');
							if (enabled === 'true') {
								await sendEmergencySMS();
							} else {
								Alert.alert(t('alerts.enableShakeDetection'), t('alerts.shakeAlertModeRequired'));
							}
						} catch (e) {
							console.warn('shake action error', e);
						}
					})();
				}
			}
		});

		return () => {
			sub && sub.remove && sub.remove();
			if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
		};
	}, [t]);

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
