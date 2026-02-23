import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BackHandler,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExitAppModal from '../../components/ExitAppModal';
import { useTheme } from '../../components/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import BatteryWatcher, { Contact } from './BatteryWatcher';

const STORAGE_KEYS = {
    BATTERY_LOW: 'batteryLowAlert',
    LOCATION_OFF: 'locationOffAlert',
};

const AlertsAndBackup: React.FC = () => {
    const { theme } = useTheme();
    const router = useRouter();
    const { t } = useTranslation();
    const { logNotification } = useNotifications();

    // Toggle switches (initially null, load from storage)
    const [batteryLowAlert, setBatteryLowAlert] = useState<boolean | null>(null);
    const [locationOffAlert, setLocationOffAlert] = useState<boolean | null>(null);

    // Battery monitoring
    const [batteryLevel, setBatteryLevel] = useState<number>(1);
    const [batteryCheckInterval, setBatteryCheckInterval] = useState<NodeJS.Timeout | null>(null);
    const lastBatteryNotificationRef = React.useRef<number>(0);

    // Location monitoring
    const [locationEnabled, setLocationEnabled] = useState<boolean>(true);
    const [locationCheckInterval, setLocationCheckInterval] = useState<NodeJS.Timeout | null>(null);
    const lastLocationNotificationRef = React.useRef<number>(0);

    // Last known location
    const [lastLocation, setLastLocation] = useState(t('fetchingLocation'));

    // Exit modal
    const [exitModalVisible, setExitModalVisible] = useState(false);

    // Example emergency contacts
    const emergencyContacts: Contact[] = [
        { name: 'Mom', phone: '9999999999' },
        { name: 'Dad', phone: '8888888888' },
    ];

    // Handle back button press
    const handleBackPress = () => {
        router.back();
    };

    // Load toggle states from AsyncStorage on mount
    useEffect(() => {
        const loadToggles = async () => {
            try {
                const [
                    storedBattery,
                    storedLocationOff,
                ] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEYS.BATTERY_LOW),
                    AsyncStorage.getItem(STORAGE_KEYS.LOCATION_OFF),
                ]);

                setBatteryLowAlert(
                    storedBattery !== null ? storedBattery === 'true' : true, // default ON
                );
                setLocationOffAlert(
                    storedLocationOff !== null ? storedLocationOff === 'true' : true, // default ON
                );
            } catch (e) {
                // If any error, just use defaults
                // If any error, just use defaults
                setBatteryLowAlert(true);
                setLocationOffAlert(true);
            }
        };

        loadToggles();
    }, []);

    // Persist each toggle when it changes
    useEffect(() => {
        if (batteryLowAlert === null) return;
        AsyncStorage.setItem(STORAGE_KEYS.BATTERY_LOW, String(batteryLowAlert));
    }, [batteryLowAlert]);

    useEffect(() => {
        if (locationOffAlert === null) return;
        AsyncStorage.setItem(STORAGE_KEYS.LOCATION_OFF, String(locationOffAlert));
    }, [locationOffAlert]);

    // Fetch last known location in human-readable format
    useEffect(() => {
        const fetchLastLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setLastLocation(t('permissionDenied'));
                    return;
                }

                const loc = await Location.getLastKnownPositionAsync({});
                if (!loc) {
                    setLastLocation(t('locationUnavailable'));
                    return;
                }

                const addressArr = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });

                if (addressArr.length > 0) {
                    const addr = addressArr[0];
                    const parts = [
                        addr.streetNumber,
                        addr.street,
                        addr.subregion,
                        addr.city,
                        addr.region,
                        addr.postalCode,
                        addr.country,
                    ].filter(Boolean);
                    const readableAddress = parts.join(', ');
                    setLastLocation(
                        readableAddress ||
                        `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`,
                    );
                } else {
                    setLastLocation(
                        `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`,
                    );
                }
            } catch (error) {
                console.log('Location fetch error:', error);
                setLastLocation(t('errorFetchingLocation'));
            }
        };

        fetchLastLocation();
    }, []);

    // Monitor battery level and send notifications every 15 minutes if below 30%
    useEffect(() => {
        const checkBatteryAndSetInterval = async () => {
            // Check battery immediately on mount
            const level = await Battery.getBatteryLevelAsync();
            setBatteryLevel(level);

            if (batteryLowAlert && level <= 0.3) {
                const now = Date.now();
                // Send notification if more than 15 minutes have passed
                if (now - lastBatteryNotificationRef.current >= 15 * 60 * 1000) {
                    logNotification(
                        'battery_low',
                        t('batteryLowWarningTitle'),
                        t('batteryLowWarningMessage', { level: Math.round(level * 100) })
                    );
                    lastBatteryNotificationRef.current = now;
                }
            }

            // Set up interval to check battery every 15 minutes
            const interval = setInterval(async () => {
                const currentLevel = await Battery.getBatteryLevelAsync();
                setBatteryLevel(currentLevel);

                if (batteryLowAlert && currentLevel <= 0.3) {
                    const now = Date.now();
                    // Send notification if more than 15 minutes have passed
                    if (now - lastBatteryNotificationRef.current >= 15 * 60 * 1000) {
                        logNotification(
                            'battery_low',
                            t('batteryLowWarningTitle'),
                            t('batteryLowWarningMessage', { level: Math.round(currentLevel * 100) })
                        );
                        lastBatteryNotificationRef.current = now;
                    }
                }
            }, 15 * 60 * 1000); // Check every 15 minutes

            setBatteryCheckInterval(interval);

            return () => {
                if (interval) clearInterval(interval);
            };
        };

        checkBatteryAndSetInterval();
    }, [batteryLowAlert, logNotification]);

    // Cleanup battery check interval on unmount
    useEffect(() => {
        return () => {
            if (batteryCheckInterval) {
                clearInterval(batteryCheckInterval);
            }
        };
    }, [batteryCheckInterval]);

    // Monitor location status and send notifications every 15 minutes if location is off
    useEffect(() => {
        const checkLocationAndSetInterval = async () => {
            // Check location permission immediately on mount
            const { status } = await Location.getForegroundPermissionsAsync();
            const isEnabled = status === 'granted';
            setLocationEnabled(isEnabled);

            if (locationOffAlert && !isEnabled) {
                const now = Date.now();
                // Send notification if more than 15 minutes have passed
                if (now - lastLocationNotificationRef.current >= 15 * 60 * 1000) {
                    logNotification(
                        'location_off',
                        t('locationOffTitle'),
                        t('locationOffMessage')
                    );
                    lastLocationNotificationRef.current = now;
                }
            }

            // Set up interval to check location every 15 minutes
            const interval = setInterval(async () => {
                const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
                const currentEnabled = currentStatus === 'granted';
                setLocationEnabled(currentEnabled);

                if (locationOffAlert && !currentEnabled) {
                    const now = Date.now();
                    // Send notification if more than 15 minutes have passed
                    if (now - lastLocationNotificationRef.current >= 15 * 60 * 1000) {
                        logNotification(
                            'location_off',
                            t('locationOffTitle'),
                            t('locationOffMessage')
                        );
                        lastLocationNotificationRef.current = now;
                    }
                }
            }, 15 * 60 * 1000); // Check every 15 minutes

            setLocationCheckInterval(interval);

            return () => {
                if (interval) clearInterval(interval);
            };
        };

        checkLocationAndSetInterval();
    }, [locationOffAlert, logNotification]);

    // Cleanup location check interval on unmount
    useEffect(() => {
        return () => {
            if (locationCheckInterval) {
                clearInterval(locationCheckInterval);
            }
        };
    }, [locationCheckInterval]);

    const dynamicStyles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: theme === "dark" ? "#111" : "#FFF" },
        headerBg: {
            height: 95,
            backgroundColor: theme === "dark" ? "#111" : "#FFF",
            paddingTop: 26,
            borderBottomWidth: 1.2,
            borderBottomColor: theme === "dark" ? "#333" : "#DDD",
        },


        headerRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            paddingHorizontal: 18,
            paddingVertical: 10,
        },

        /* LEFT + RIGHT BUTTON COMMON STYLE */
        sideButton: {
            position: "absolute",
            top: 10,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 10,
        },

        /* LEFT ARROW */
        sideButtonLeft: {
            left: 10,
        },

        /* RIGHT AVATAR */
        sideButtonRight: {
            right: 10,
        },

        /* TITLE CENTER FIX */
        titleWrapper: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
        },

        title: {
            color: theme === "dark" ? "#FFF" : "#000",
            fontSize: 18,
            fontWeight: "600",
            marginTop: 5,
        },

        content: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
        alertCard: {
            backgroundColor: theme === "dark" ? "#222" : "#fff",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
        },
        alertContent: { flex: 1, marginRight: 16 },
        alertTitle: { fontSize: 16, fontWeight: '600', color: theme === "dark" ? "#fff" : "#000", marginBottom: 6 },
        alertDescription: { fontSize: 14, color: theme === "dark" ? "#ccc" : "#666", lineHeight: 20 },
        switch: { transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] },
        locationCard: {
            backgroundColor: theme === "dark" ? "#222" : "#fff",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
        },
        locationContent: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
        mapPlaceholder: {
            width: 80,
            height: 80,
            backgroundColor: theme === "dark" ? "#333" : "#F0F0F0",
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
        },
        locationInfo: { flex: 1 },
        locationTextContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
        locationPin: { marginRight: 6, marginTop: 2 },
        locationAddress: { fontSize: 14, fontWeight: '500', color: theme === "dark" ? "#fff" : "#000", flex: 1, lineHeight: 20 },
        locationTime: { fontSize: 12, color: theme === "dark" ? "#aaa" : "#999", marginLeft: 22 },
    }), [theme]);

    // While toggles are loading, you can return null or a loader
    if (
        batteryLowAlert === null ||
        locationOffAlert === null
    ) {
        return (
            <SafeAreaView
                style={dynamicStyles.container}
                edges={['left', 'right', 'bottom']}
            >

                <StatusBar
                    backgroundColor={theme === "dark" ? "#111" : "#FFF"}
                    barStyle={theme === "dark" ? "light-content" : "dark-content"}
                />

                <View style={dynamicStyles.headerBg}>
                    <View style={dynamicStyles.headerRow}>
                        <TouchableOpacity
                            style={[dynamicStyles.sideButton, dynamicStyles.sideButtonLeft]}
                            onPress={handleBackPress}
                        >
                            <Ionicons name="chevron-back" size={26} color={theme === "dark" ? "#FFF" : "#000"} />
                        </TouchableOpacity>
                        <View style={dynamicStyles.titleWrapper}>
                            <Text style={dynamicStyles.title}>{t('alerts_and_backup')}</Text>
                        </View>
                        <View style={[dynamicStyles.sideButton, dynamicStyles.sideButtonRight]} />
                    </View>
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: theme === "dark" ? "#fff" : "#000" }}>{t('loadingSettings')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (

        <SafeAreaView
            style={dynamicStyles.container}
            edges={['left', 'right', 'bottom']}
        >
            <StatusBar
                barStyle={theme === "dark" ? "light-content" : "dark-content"}
                backgroundColor={theme === "dark" ? "#111" : "#FFF"}
            />

            <View style={dynamicStyles.headerBg}>
                <View style={dynamicStyles.headerRow}>

                    {/* LEFT BACK BUTTON */}
                    <TouchableOpacity
                        style={[dynamicStyles.sideButton, dynamicStyles.sideButtonLeft]}
                        onPress={handleBackPress}
                    >
                        <Ionicons name="chevron-back" size={26} color={theme === "dark" ? "#FFF" : "#000"} />
                    </TouchableOpacity>

                    {/* CENTER TITLE */}
                    <View style={[dynamicStyles.titleWrapper, { marginHorizontal: 50 }]}>
                        <Text style={dynamicStyles.title} numberOfLines={1}>
                            {t('alerts_and_backup')}
                        </Text>
                    </View>



                </View>
            </View>


            <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
                {/* Battery Low Alert */}
                <View style={dynamicStyles.alertCard}>
                    <View style={dynamicStyles.alertContent}>
                        <Text style={dynamicStyles.alertTitle}>{t('batteryLowAlert')}</Text>
                        <Text style={dynamicStyles.alertDescription}>
                            {t('batteryLowAlertDescription')}
                        </Text>
                    </View>
                    <Switch
                        trackColor={{ false: theme === "dark" ? "#555" : '#E5E5E5', true: '#FF8A80' }}
                        thumbColor={batteryLowAlert ? '#FF4444' : theme === "dark" ? "#ccc" : '#f4f3f4'}
                        ios_backgroundColor={theme === "dark" ? "#555" : "#E5E5E5"}
                        onValueChange={setBatteryLowAlert}
                        value={batteryLowAlert}
                        style={dynamicStyles.switch}
                    />
                </View>

                {/* Location Off Alert */}
                <View style={dynamicStyles.alertCard}>
                    <View style={dynamicStyles.alertContent}>
                        <Text style={dynamicStyles.alertTitle}>{t('locationOffAlert')}</Text>
                        <Text style={dynamicStyles.alertDescription}>
                            {t('locationOffAlertDescription')}
                        </Text>
                    </View>
                    <Switch
                        trackColor={{ false: theme === "dark" ? "#555" : '#E5E5E5', true: '#FF8A80' }}
                        thumbColor={locationOffAlert ? '#FF4444' : theme === "dark" ? "#ccc" : '#f4f3f4'}
                        ios_backgroundColor={theme === "dark" ? "#555" : "#E5E5E5"}
                        onValueChange={setLocationOffAlert}
                        value={locationOffAlert}
                        style={dynamicStyles.switch}
                    />
                </View>

                {/* Last Known Location */}
                <View style={dynamicStyles.locationCard}>
                    <Text style={dynamicStyles.alertTitle}>{t('lastKnownLocation')}</Text>
                    <View style={dynamicStyles.locationContent}>
                        <View style={dynamicStyles.mapPlaceholder}>
                            <Ionicons name="location-outline" size={40} color="#ccc" />
                        </View>
                        <View style={dynamicStyles.locationInfo}>
                            <View style={dynamicStyles.locationTextContainer}>
                                <Ionicons
                                    name="location"
                                    size={16}
                                    color="#FF4444"
                                    style={dynamicStyles.locationPin}
                                />
                                <Text style={dynamicStyles.locationAddress}>{lastLocation}</Text>
                            </View>
                            <Text style={dynamicStyles.locationTime}>{t('lastUpdated')} 5 min ago</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <ExitAppModal
                visible={exitModalVisible}
                onCancel={() => setExitModalVisible(false)}
                onConfirm={() => { setExitModalVisible(false); BackHandler.exitApp(); }}
            />

            {/* BatteryWatcher triggers notifications and updates location */}
            {(() => {
                const BatteryWatcherAny = BatteryWatcher as React.ComponentType<any>;
                return (
                    <BatteryWatcherAny
                        batteryLowAlert={batteryLowAlert}
                        locationOffAlert={locationOffAlert}
                        simulateFivePercentDrop={true}
                        contacts={emergencyContacts}
                        setLastLocation={setLastLocation}
                    />
                );
            })()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        paddingTop: Platform.OS === 'android' ? 40 : 20,
    },
    backButton: { padding: 5 },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 20,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    notificationIcon: { marginRight: 12 },
    profileContainer: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
    profileImage: { width: '100%', height: '100%', borderRadius: 16 },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
    alertCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    alertContent: { flex: 1, marginRight: 16 },
    alertTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 6 },
    alertDescription: { fontSize: 14, color: '#666', lineHeight: 20 },
    switch: { transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] },
    locationCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    locationContent: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    mapPlaceholder: {
        width: 80,
        height: 80,
        backgroundColor: '#F0F0F0',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    locationInfo: { flex: 1 },
    locationTextContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    locationPin: { marginRight: 6, marginTop: 2 },
    locationAddress: { fontSize: 14, fontWeight: '500', color: '#000', flex: 1, lineHeight: 20 },
    locationTime: { fontSize: 12, color: '#999', marginLeft: 22 },
    sideButtonLeft: {
        left: 10,
    },

    sideButtonRight: {
        right: 10,
    },

});


export default AlertsAndBackup;