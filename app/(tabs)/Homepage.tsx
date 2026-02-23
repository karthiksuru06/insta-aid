import { Entypo, Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import * as SMS from 'expo-sms';
import { onAuthStateChanged, User } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnnouncementButton from '../../components/AnnouncementButton';
import { AvatarComponent } from '../../components/AvatarComponent';
import NeedHelpFab from '../../components/NeedHelpFab';
import NotificationButton from '../../components/NotificationButton';
import { useTheme } from '../../components/ThemeContext';
import { auth, db } from '../../firebaseConfig';
import { usePermissions } from '../../hooks/usePermissions';

// Shake detection constants
const SHAKE_THRESHOLD = 2.0;
const ACCELEROMETER_UPDATE_INTERVAL = 300;
const SHAKE_RESET_INTERVAL = 5000;

export default function HomeScreen() {
    const { theme } = useTheme();
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('Home');
    const [user, setUser] = useState<User | null>(null);
    const [batteryLevel, setBatteryLevel] = useState<number>(100);
    const [isCharging, setIsCharging] = useState<boolean>(false);
    const lastNotifiedLevel = useRef<number>(100);
    const router = useRouter();

    const { permissions } = usePermissions();
    const [deviceLocationEnabled, setDeviceLocationEnabled] = useState<boolean>(false);
    const [isShakeDetectionOn, setIsShakeDetectionOn] = useState(false);
    const [shakeCount, setShakeCount] = useState<number>(0);
    const shakeTimeoutRef = useRef<number | null>(null);

    // Auth listener
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsub();
    }, []);

    // Load shake detection state from AsyncStorage
    useEffect(() => {
        const loadShakeDetection = async () => {
            try {
                const value = await AsyncStorage.getItem("shakeDetectionEnabled");
                if (value !== null) {
                    setIsShakeDetectionOn(value === "true");
                }
            } catch (err) {
                console.warn("Error loading shake detection setting", err);
            }
        };
        loadShakeDetection();
    }, []);

    // Save shake detection state to AsyncStorage
    useEffect(() => {
        const saveShakeDetection = async () => {
            try {
                await AsyncStorage.setItem("shakeDetectionEnabled", isShakeDetectionOn.toString());
            } catch (err) {
                console.warn("Error saving shake detection setting", err);
            }
        };
        saveShakeDetection();
    }, [isShakeDetectionOn]);

    // Handler for toggling shake detection: ensure SMS permission is enabled
    const handleShakeToggle = async (value: boolean) => {
        if (value) {
            try {
                const smsPerm = await AsyncStorage.getItem('smsEnabled');
                if (smsPerm === 'true') {
                    setIsShakeDetectionOn(true);
                    return;
                }

                const isAvailable = await SMS.isAvailableAsync();
                if (!isAvailable) {
                    Alert.alert(t('alerts.smsNotAvailable'), t('alerts.cannotUseSms'));
                    return;
                }

                Alert.alert(
                    t('alerts.smsPermissionRequired'),
                    t('alerts.smsAccessRequired'),
                    [
                        { text: t('alerts.cancel'), style: 'cancel' },
                        { text: t('alerts.openPermissions'), onPress: () => router.push('/EnablePermissions') },
                    ]
                );
            } catch (err) {
                console.warn('Error checking SMS permission', err);
            }
        } else {
            setIsShakeDetectionOn(false);
        }
    };

    // Battery monitoring
    useEffect(() => {
        (async () => {
            const level = await Battery.getBatteryLevelAsync();
            setBatteryLevel(Math.floor(level * 100));
            const status = await Battery.getBatteryStateAsync();
            setIsCharging(status === Battery.BatteryState.CHARGING || status === Battery.BatteryState.FULL);
        })();

        const sub = Battery.addBatteryLevelListener(({ batteryLevel: lvl }) => {
            const percent = Math.floor(lvl * 100);
            setBatteryLevel(percent);

            if (percent <= 25 && percent <= lastNotifiedLevel.current - 5) {
                lastNotifiedLevel.current = percent;
                notifyFirstContact(percent);
            }
        });

        const stateSub = Battery.addBatteryStateListener(({ batteryState }) => {
            setIsCharging(batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL);
        });

        return () => {
            sub && sub.remove && sub.remove();
            stateSub && stateSub.remove && stateSub.remove();
        };
    }, []);

    // Keep a device-level check for location permission so UI reflects actual permission state
    useEffect(() => {
        checkLocationPermission();
    }, [permissions.locationEnabled]);

    useFocusEffect(
        React.useCallback(() => {
            checkLocationPermission();
            const interval = setInterval(checkLocationPermission, 3000);
            return () => clearInterval(interval);
        }, [])
    );

    const checkLocationPermission = async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            setDeviceLocationEnabled(status === 'granted' && servicesEnabled);
        } catch (e) {
            console.warn('Error checking foreground location permission', e);
        }
    };

    const getEmergencyContacts = async (uid: string): Promise<string[]> => {
        const userDocRef = doc(db, 'users', uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) return [];
        const data = snap.data() as any;
        return (data.emergencyContacts ?? [])
            .map((c: any) => c.phone)
            .filter(Boolean);
    };

    // Log alert to Firestore
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
            // Optionally: console.log('Alert logged:', type, details);
        } catch (e) {
            console.warn('Failed to log alert', e);
            Alert.alert(t('alerts.loggingError'), t('alerts.failedToLogAlert'));
        }
    };

    const notifyFirstContact = async (level: number) => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const contacts = (await getEmergencyContacts(currentUser.uid)).slice(0, 1);
            if (contacts.length === 0) return;

            const message = `⚠ Battery low: ${level}% remaining. I may lose access soon.`;
            const isAvailable = await SMS.isAvailableAsync();

            if (isAvailable) {
                await SMS.sendSMSAsync(contacts, message);
                Alert.alert(t('alerts.batteryAlert'), t('alerts.batteryMessageSent', { level }));
                // Log battery low alert
                await logAlert('battery_low', { level, contacts });
            }
        } catch (err) {
            console.warn('Battery notify error', err);
        }
    };

    // Shake detection logic
    useEffect(() => {
        if (Platform.OS === 'web') return;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('alerts.permissionNeeded'), t('alerts.locationAccessRequired'));
                setIsShakeDetectionOn(false);
                return;
            }
        })();

        Accelerometer.setUpdateInterval(ACCELEROMETER_UPDATE_INTERVAL);

        const subscription = Accelerometer.addListener((data) => {
            // Always count shakes so we can prompt the user to enable the toggle when OFF
            const totalForce = Math.abs(data.x) + Math.abs(data.y) + Math.abs(data.z);

            if (totalForce > SHAKE_THRESHOLD) {
                setShakeCount((prev) => prev + 1);

                if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);

                shakeTimeoutRef.current = setTimeout(() => {
                    setShakeCount(0);
                }, SHAKE_RESET_INTERVAL) as unknown as number;
            }
        });

        return () => {
            subscription && subscription.remove();
            if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        };
    }, [isShakeDetectionOn]);

    // Trigger action after 3 shakes
    useEffect(() => {
        if (shakeCount >= 3) {
            setShakeCount(0); // reset immediately
            if (shakeTimeoutRef.current) {
                clearTimeout(shakeTimeoutRef.current);
                shakeTimeoutRef.current = null;
            }

            if (!isShakeDetectionOn) {
                Alert.alert(
                    t('alerts.enableShakeDetection'),
                    t('alerts.shakeAlertModeRequired')
                );
                return;
            }

            sendEmergencySMS();
        }
    }, [shakeCount, isShakeDetectionOn]);

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
                // Log shake/motion alert
                await logAlert('motion_shake', { coords, contacts });
            } else {
                Alert.alert(t('alerts.error'), t('alerts.smsNotAvailableOnDevice'));
            }
        } catch (err) {
            console.warn('Emergency SMS error', err);
            Alert.alert(t('alerts.error'), t('alerts.failedToGetLocationOrSendSMS'));
        }
    };

    // ✅ Updated Fake Call logic
    const handleFakeCallPress = async () => {
        try {
            const isEnabled = await AsyncStorage.getItem("fakeCallEnabled");
            if (isEnabled === "true") {
                // Log fake call alert
                await logAlert('fake_call', {});
                router.push('/FakeCall');
            } else {
                Alert.alert(
                    t('alerts.fakeCallDisabled'),
                    t('alerts.enableFakeCallInSafetyFeatures')
                );
            }
        } catch (err) {
            console.warn("Error reading fake call setting", err);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme === "dark" ? "#111" : "#fff" }]}>
            {/* Header */}
            <View style={[styles.headerBg, { backgroundColor: theme === "dark" ? "#111" : "#fff", paddingTop: insets.top, height: 75 + insets.top }]}>
                <View style={[styles.headerRow, { paddingBottom: 6 }]}>
                    <Text style={[styles.greeting, { color: theme === "dark" ? "#fff" : "#000" }]} numberOfLines={1}>
                        {t('hello')} {user?.displayName?.toUpperCase() ?? user?.email?.split('@')[0]?.toUpperCase() ?? 'USER'}
                    </Text>
                    <View style={styles.headerRight}>
                        <AnnouncementButton color="#FF5C62" />
                        <NotificationButton color="#FF5C62" />
                        <TouchableOpacity onPress={() => router.push('/Profile')} activeOpacity={0.8}>
                            <AvatarComponent email={user?.email || 'U'} size={28} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Status */}
            <View style={[styles.statusRow, { paddingHorizontal: 24, paddingTop: 0, marginTop: -10 }]}>
                <View style={[styles.dot, { backgroundColor: deviceLocationEnabled ? '#31B057' : '#999' }]} />
                <Text style={[styles.statusText, { color: theme === "dark" ? "#ccc" : "#444" }]}>
                    {deviceLocationEnabled ? t('liveLocationOn') : t('liveLocationOff')}
                </Text>
                <BatteryIndicator batteryLevel={batteryLevel} isCharging={isCharging} />
            </View>

            <Text style={[styles.title, { color: theme === "dark" ? "#fff" : "#000", paddingHorizontal: 24, marginTop: 20 }]}>{t('needInstantAid')}</Text>

            {/* Shake Detection Toggle */}
            <View style={[styles.toggleContainer, { backgroundColor: theme === "dark" ? "#222" : "#fef3f3", marginHorizontal: 24 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.toggleTitle, { color: theme === "dark" ? "#fff" : "#333" }]}>{t('enableShakeAlertMode')}</Text>
                    <Text style={[styles.toggleSubtitle, { color: theme === "dark" ? "#ccc" : "#666" }]}>
                        {t('shakeAlertDescription')}
                    </Text>
                </View>
                <Switch
                    trackColor={{ false: '#767577', true: '#ED4C4C' }}
                    thumbColor={isShakeDetectionOn ? '#fff' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={handleShakeToggle}
                    value={isShakeDetectionOn}
                />
            </View>

            <Text style={[styles.subtitle, { color: theme === "dark" ? "#ccc" : "#888", paddingHorizontal: 24 }]}>
                {t('shakeInstructions')}
            </Text>

            {/* Big Button */}
            <TouchableOpacity
                style={styles.locationButton}
                onPress={() => router.push('/(tabs)/Locationpage')}
            >
                <Entypo name="location-pin" size={70} color="#fff" />
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
                <AppButton
                    theme={theme}
                    iconName="phone"
                    iconType={Feather}
                    text={t('fakeCall')}
                    onPress={handleFakeCallPress}
                />
                <AppButton
                    theme={theme}
                    iconName="location-on"
                    iconType={MaterialIcons}
                    text={t('locationSharing')}
                    onPress={() => router.push('/(tabs)/Locationpage')}
                />
            </View>
            <NeedHelpFab />
        </View>
    );
}

// Components
function BatteryIndicator({ batteryLevel, isCharging }: { batteryLevel: number; isCharging: boolean }) {
    const { theme } = useTheme();
    const isLow = batteryLevel <= 20;
    const color = theme === "dark" ? "#ccc" : "#444";
    // Now black (or white in dark mode) instead of green
    const fillColor = isLow ? "#FF3B30" : (theme === "dark" ? "#fff" : "#000");

    return (
        <View style={styles.batteryContainer}>
            <Text style={[styles.batteryText, { color }]}>{batteryLevel}%</Text>
            <View style={styles.batteryIconFrame}>
                <View style={[styles.batteryBody, { borderColor: color }]}>
                    <View style={[styles.batteryFill, { width: `${batteryLevel}%`, backgroundColor: fillColor }]} />
                    {isCharging && (
                        <View style={styles.chargingBoltContainer}>
                            <Ionicons name="flash" size={7} color={theme === "dark" ? "#000" : "#fff"} />
                        </View>
                    )}
                </View>
                <View style={[styles.batteryCap, { backgroundColor: color }]} />
            </View>
        </View>
    );
}

function AppButton({ iconName, iconType, text, onPress, theme }: { iconName: string; iconType: any; text: string; onPress?: () => void; theme: string }) {
    const IconComponent = iconType;
    return (
        <TouchableOpacity style={[styles.appButton, { backgroundColor: theme === "dark" ? "#222" : "#fff", borderColor: theme === "dark" ? "#555" : "#ED4C4C" }]} onPress={onPress}>
            <IconComponent name={iconName} size={20} color={theme === "dark" ? "#fff" : "#333"} />
            <Text style={[styles.appButtonText, { color: theme === "dark" ? "#fff" : "#333" }]}>{text}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    headerBg: { backgroundColor: '#fff', width: '100%', justifyContent: 'flex-end' },
    headerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, justifyContent: 'space-between' },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#eee' },
    greeting: { fontWeight: 'bold', fontSize: 15, color: '#000', flex: 1 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 0, marginBottom: 4 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ED4C4C', marginRight: 6 },
    statusText: { fontSize: 14, color: '#444', marginRight: 8 },
    batteryContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
    batteryText: { marginRight: 6, fontSize: 11, fontWeight: '600' },
    batteryIconFrame: { flexDirection: 'row', alignItems: 'center' },
    batteryBody: { width: 18, height: 9, borderWidth: 1, borderRadius: 1.5, padding: 0.6, justifyContent: 'center', position: 'relative' },
    batteryFill: { height: '100%', borderRadius: 0.2 },
    batteryCap: { width: 1.2, height: 3, borderTopRightRadius: 0.5, borderBottomRightRadius: 0.5, marginLeft: 0 },
    chargingBoltContainer: { position: 'absolute', top: -1.5, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fef3f3',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#ED4C4C',
        shadowColor: '#ED4C4C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    toggleTitle: { fontWeight: 'bold', fontSize: 16, color: '#333', flexDirection: 'row', alignItems: 'center' },
    toggleSubtitle: { fontSize: 12, color: '#666', marginTop: 6, maxWidth: 240, lineHeight: 16 },
    title: { fontWeight: 'bold', fontSize: 24, alignSelf: 'center', marginVertical: 8 },
    subtitle: { color: '#888', fontSize: 14, alignSelf: 'center', textAlign: 'center', marginBottom: 12, lineHeight: 20 },
    locationButton: {
        backgroundColor: '#ED4C4C',
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        height: 120,
        width: 120,
        borderRadius: 60,
        marginBottom: 16,
    },
    buttonContainer: { width: '100%', paddingHorizontal: 24 },
    appButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ED4C4C',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        justifyContent: 'center',
        shadowColor: '#ED4C4C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    appButtonText: { fontSize: 16, marginLeft: 10, color: '#333', fontWeight: '500' },
});