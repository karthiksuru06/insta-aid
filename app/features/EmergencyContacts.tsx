import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import * as SMS from 'expo-sms';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../components/ThemeContext';
import { useShakeDetection } from '../../contexts/ShakeDetectionContext';
import { shakeEventEmitter } from '../../contexts/ShakeEventEmitter';
import { auth, db } from '../../firebaseConfig';

const SHAKE_THRESHOLD = 2;
const ACCELEROMETER_UPDATE_INTERVAL = 50;
const SHAKE_RESET_INTERVAL = 1500;

export default function EmergencyContactsScreen() {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const [shakeCount, setShakeCount] = useState<number>(0);
    const shakeTimeoutRef = useRef<number | null>(null);
    const lastShakeTimeRef = useRef<number>(0);
    const accelerometerSubscriptionRef = useRef<any>(null);
    const [isSending, setIsSending] = useState(false);

    const { isShakeDetectionOn, setIsShakeDetectionOn, isShakeLocked, setIsShakeLocked } = useShakeDetection();

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('[EmergencyContacts] Cleaning up');
            if (accelerometerSubscriptionRef.current) {
                accelerometerSubscriptionRef.current.remove();
            }
            if (shakeTimeoutRef.current) {
                clearTimeout(shakeTimeoutRef.current);
            }
        };
    }, []);

    // Setup accelerometer
    useEffect(() => {
        if (Platform.OS === 'web') {
            console.log('[EmergencyContacts] Skipping on web');
            return;
        }

        console.log('[EmergencyContacts] Starting accelerometer');

        try {
            Accelerometer.setUpdateInterval(ACCELEROMETER_UPDATE_INTERVAL);

            const subscription = Accelerometer.addListener(({ x, y, z }) => {
                const totalForce = Math.sqrt(x * x + y * y + z * z);

                if (totalForce > SHAKE_THRESHOLD) {
                    const now = Date.now();

                    if (now - lastShakeTimeRef.current > 300) {
                        lastShakeTimeRef.current = now;

                        setShakeCount((prev) => {
                            const newCount = prev + 1;
                            console.log('[EmergencyContacts] 🔥 SHAKE:', newCount, '/', 3);
                            return newCount;
                        });

                        if (shakeTimeoutRef.current) {
                            clearTimeout(shakeTimeoutRef.current);
                        }

                        shakeTimeoutRef.current = setTimeout(() => {
                            console.log('[EmergencyContacts] Shake reset');
                            setShakeCount(0);
                        }, SHAKE_RESET_INTERVAL) as unknown as number;
                    }
                }
            });

            accelerometerSubscriptionRef.current = subscription;
            console.log('[EmergencyContacts] ✅ Accelerometer ready');

            return () => {
                console.log('[EmergencyContacts] Removing accelerometer');
                subscription.remove();
                if (shakeTimeoutRef.current) {
                    clearTimeout(shakeTimeoutRef.current);
                }
            };
        } catch (err) {
            console.warn('[EmergencyContacts] Accelerometer error', err);
        }
    }, []);

    // Handle shake count
    useEffect(() => {
        if (shakeCount >= 3) {
            console.log('[EmergencyContacts] 3 shakes detected! Toggle state:', isShakeDetectionOn);
            setShakeCount(0);
            if (shakeTimeoutRef.current) {
                clearTimeout(shakeTimeoutRef.current);
                shakeTimeoutRef.current = null;
            }

            // Prevent multiple triggers
            if (isShakeLocked) {
                console.log('[EmergencyContacts] Shake already processing, ignoring');
                return;
            }

            setIsShakeLocked(true);

            // Respect global toggle: if OFF, prompt to enable and do NOT trigger the test alert
            if (!isShakeDetectionOn) {
                Alert.alert(
                    t('alerts.enableShakeDetection'),
                    t('alerts.shakeAlertModeRequired'),
                    [
                        { text: t('alerts.turnOn'), onPress: () => setIsShakeDetectionOn(true) },
                        { text: t('alerts.cancel'), style: 'cancel' },
                    ]
                );
                setIsShakeLocked(false);
                return;
            }

            // Toggle is ON -> proceed with the existing test-shake flow
            triggerTestShake();
        }
    }, [shakeCount, isShakeDetectionOn, isShakeLocked, t]);

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
            console.warn('[EmergencyContacts] Get contacts error', err);
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
            console.warn('[EmergencyContacts] Log error', e);
        }
    };

    const sendLocationDirectly = async () => {
        if (isSending) {
            console.log('[EmergencyContacts] Already sending');
            return;
        }

        try {
            setIsSending(true);

            const currentUser = auth.currentUser;
            if (!currentUser) {
                Alert.alert(t('alerts.error'), t('activeLocation.error')); // Using activeLocation.error or generic
                setIsShakeLocked(false);
                return;
            }

            const contacts = await getEmergencyContacts(currentUser.uid);
            if (contacts.length === 0) {
                Alert.alert(t('alerts.noContacts'), t('alerts.addEmergencyContacts'));
                setIsShakeLocked(false);
                return;
            }

            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('alerts.permissionError'), t('alerts.locationPermissionRequired'));
                setIsShakeLocked(false);
                return;
            }

            console.log('[EmergencyContacts] Getting location...');
            const { coords } = await Location.getCurrentPositionAsync({});
            const locationUrl = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
            const message = `🚨 EMERGENCY! I need help! My live location: ${locationUrl}`;

            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
                console.log('[EmergencyContacts] Sending SMS to', contacts.length, 'contacts');
                await SMS.sendSMSAsync(contacts, message);
                Alert.alert(t('alerts.emergencyAlert'), t('alerts.locationShared'));
                await logAlert('emergency_share', { coords, contacts });
            } else {
                Alert.alert(t('alerts.error'), t('alerts.smsNotAvailableOnDevice'));
            }
        } catch (err) {
            console.warn('[EmergencyContacts] Send error', err);
            Alert.alert(t('alerts.error'), t('alerts.failedToGetLocationOrSendSMS'));
        } finally {
            setIsSending(false);
            setTimeout(() => setIsShakeLocked(false), 2000);
        }
    };

    const triggerTestShake = () => {
        sendLocationDirectly();
    };

    // Listen for shake-but-disabled from background
    useEffect(() => {
        const handleShakeDisabled = () => {
            Alert.alert(
                t('alerts.enableShakeDetection'),
                t('alerts.shakeAlertModeRequired'),
                [
                    { text: t('alerts.turnOn'), onPress: () => setIsShakeDetectionOn(true) },
                    { text: t('alerts.cancel'), style: 'cancel' },
                ]
            );
        };

        if (shakeEventEmitter) {
            shakeEventEmitter.on('shakeDetectedButDisabled', handleShakeDisabled);
            return () => {
                shakeEventEmitter.off('shakeDetectedButDisabled', handleShakeDisabled);
            };
        }
    }, [t, setIsShakeDetectionOn]);

    return (
        <View style={[styles.container, { backgroundColor: theme === "dark" ? "#111" : "#fff" }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme === "dark" ? "#fff" : "#000" }]}>
                    {t('emergencyContacts') || 'Emergency Contacts'}
                </Text>
                <Text style={[styles.subtitle, { color: theme === "dark" ? "#ccc" : "#666" }]}>
                    {t('shareLocationWithContacts') || 'Share your location with emergency contacts'}
                </Text>
            </View>

            <View style={[styles.statusBox, { backgroundColor: theme === "dark" ? "#222" : "#f0f0f0" }]}>
                <MaterialIcons name="info" size={20} color={theme === "dark" ? "#ccc" : "#666"} />
                <Text style={[styles.statusText, { color: theme === "dark" ? "#ccc" : "#666" }]}>
                    {isShakeDetectionOn
                        ? (t('emergencyContactsPage.toggleOn') || '🔴 Toggle ON - Shake detection active')
                        : (t('emergencyContactsPage.toggleOff') || '🔵 Toggle OFF - Shake detection disabled')
                    }
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.shareButton, { opacity: isSending ? 0.6 : 1 }]}
                onPress={sendLocationDirectly}
                disabled={isSending}
            >
                <MaterialIcons name="location-on" size={24} color="#fff" />
                <Text style={styles.shareButtonText}>
                    {isSending ? t('sending') || 'Sending...' : t('shareLocation') || 'Share Location'}
                </Text>
            </TouchableOpacity>

            <Text style={[styles.orText, { color: theme === "dark" ? "#ccc" : "#888" }]}>
                {t('or') || 'OR'}
            </Text>

            <View style={[styles.shakeBox, { backgroundColor: theme === "dark" ? "#1a1a1a" : "#f9f9f9", borderColor: theme === "dark" ? "#333" : "#eee" }]}>
                <MaterialIcons name="vibration" size={32} color="#ED4C4C" />
                <Text style={[styles.shakeTitle, { color: theme === "dark" ? "#fff" : "#000" }]}>
                    {t('shakeToAlert') || 'Shake to Alert'}
                </Text>
                <Text style={[styles.shakeSubtitle, { color: theme === "dark" ? "#ccc" : "#666" }]}>
                    {t('emergencyContactsPage.shakeInstructions') || 'Shake your device to send an emergency alert'}
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.testShakeButton, { backgroundColor: theme === "dark" ? "#333" : "#ddd" }]}
                onPress={triggerTestShake}
            >
                <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                <Text style={[styles.testShakeButtonText, { color: theme === "dark" ? "#fff" : "#000" }]}>
                    {t('testShake') || 'Test Shake'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
    },
    statusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 24,
    },
    statusText: {
        marginLeft: 8,
        fontSize: 16,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        marginBottom: 16,
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
    },
    orText: {
        fontSize: 16,
        fontWeight: '500',
        marginVertical: 16,
    },
    shakeBox: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 24,
    },
    shakeTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    shakeSubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    testShakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: '#007BFF',
    },
    testShakeButtonText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
    },
});