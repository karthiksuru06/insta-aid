import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../components/ThemeContext';

export default function AllowPermissions() {
    const router = useRouter();
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Safety Features toggles
    const [fakeCallEnabled, setFakeCallEnabled] = useState(false);
    const [locationAlertsEnabled, setLocationAlertsEnabled] = useState(false);

    // Alerts & Backup toggles
    const [batteryLowAlert, setBatteryLowAlert] = useState(true);
    const [locationOffAlert, setLocationOffAlert] = useState(true);

    // Last Known Location
    const [lastKnownLocation, setLastKnownLocation] = useState<string>('Fetching...');

    // Load all states from AsyncStorage
    useEffect(() => {
        const loadStates = async () => {
            try {
                const [fakeCall, locAlerts, battLow, locOff] = await Promise.all([
                    AsyncStorage.getItem('fakeCallEnabled'),
                    AsyncStorage.getItem('locationAlertsEnabled'),
                    AsyncStorage.getItem('batteryLowAlert'),
                    AsyncStorage.getItem('locationOffAlert'),
                ]);
                if (fakeCall !== null) setFakeCallEnabled(fakeCall === 'true');
                if (locAlerts !== null) setLocationAlertsEnabled(locAlerts === 'true');
                setBatteryLowAlert(battLow !== null ? battLow === 'true' : true);
                setLocationOffAlert(locOff !== null ? locOff === 'true' : true);
            } catch (e) {
                console.warn('Error loading permission states', e);
            }
        };
        loadStates();

        // Fetch last known location
        const fetchLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setLastKnownLocation(t('permissionDenied') || 'Permission denied');
                    return;
                }
                const loc = await Location.getLastKnownPositionAsync({});
                if (!loc) {
                    setLastKnownLocation(t('locationUnavailable') || 'Location unavailable');
                    return;
                }
                const addressArr = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
                if (addressArr.length > 0) {
                    const addr = addressArr[0];
                    const parts = [addr.street, addr.city, addr.region, addr.country].filter(Boolean);
                    setLastKnownLocation(
                        parts.join(', ') ||
                        `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`
                    );
                } else {
                    setLastKnownLocation(
                        `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`
                    );
                }
            } catch (e) {
                setLastKnownLocation(t('errorFetchingLocation') || 'Error fetching location');
            }
        };
        fetchLocation();
    }, []);

    // Toggle handlers
    const toggleFakeCall = async (value: boolean) => {
        setFakeCallEnabled(value);
        await AsyncStorage.setItem('fakeCallEnabled', value.toString());
    };
    const toggleLocationAlerts = async (value: boolean) => {
        setLocationAlertsEnabled(value);
        await AsyncStorage.setItem('locationAlertsEnabled', value.toString());
    };
    const toggleBatteryLow = async (value: boolean) => {
        setBatteryLowAlert(value);
        await AsyncStorage.setItem('batteryLowAlert', value.toString());
    };
    const toggleLocationOff = async (value: boolean) => {
        setLocationOffAlert(value);
        await AsyncStorage.setItem('locationOffAlert', value.toString());
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111' : '#fff' }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.headerRow, { borderBottomColor: isDark ? '#333' : '#E5E5E5' }]}>
                <TouchableOpacity style={{ width: 32 }} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={28} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
                <Text
                    style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}
                    numberOfLines={1}
                >
                    {t('allowPermissions') || 'Allow Permissions'}
                </Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* 1. Fake Call */}
                <View style={[styles.card, { backgroundColor: isDark ? '#222' : '#FAFAFA' }]}>
                    <View style={styles.cardContent}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="call" size={22} color="#ED4C4C" />
                        </View>
                        <View style={styles.textBox}>
                            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('fakeCall') || 'Fake Call'}
                            </Text>
                            <Text style={[styles.cardDesc, { color: isDark ? '#aaa' : '#7C7C80' }]}>
                                {t('fakeCallDescription') || 'Simulate an incoming call'}
                            </Text>
                            <Text style={[styles.statusText, { color: fakeCallEnabled ? '#ED4C4C' : '#999' }]}>
                                {fakeCallEnabled ? (t('enabled') || 'Enabled') : (t('off') || 'Off')}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={fakeCallEnabled}
                        onValueChange={toggleFakeCall}
                        trackColor={{ false: '#E8E8E8', true: '#FFE5E5' }}
                        thumbColor={fakeCallEnabled ? '#ED4C4C' : '#fff'}
                    />
                </View>

                {/* 2. Location Alerts */}
                <View style={[styles.card, { backgroundColor: isDark ? '#222' : '#FAFAFA' }]}>
                    <View style={styles.cardContent}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="map-marker-alert" size={22} color="#ED4C4C" />
                        </View>
                        <View style={styles.textBox}>
                            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('locationAlerts') || 'Location Alerts'}
                            </Text>
                            <Text style={[styles.cardDesc, { color: isDark ? '#aaa' : '#7C7C80' }]}>
                                {t('locationAlertsDescription') || 'Get alerts for location changes'}
                            </Text>
                            <Text style={[styles.statusText, { color: locationAlertsEnabled ? '#ED4C4C' : '#999' }]}>
                                {locationAlertsEnabled ? (t('enabled') || 'Enabled') : (t('off') || 'Off')}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={locationAlertsEnabled}
                        onValueChange={toggleLocationAlerts}
                        trackColor={{ false: '#E8E8E8', true: '#FFE5E5' }}
                        thumbColor={locationAlertsEnabled ? '#ED4C4C' : '#fff'}
                    />
                </View>

                {/* 3. Battery Low Alert */}
                <View style={[styles.card, { backgroundColor: isDark ? '#222' : '#FAFAFA' }]}>
                    <View style={styles.cardContent}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="battery-half" size={22} color="#ED4C4C" />
                        </View>
                        <View style={styles.textBox}>
                            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('batteryLowAlert') || 'Battery Low Alert'}
                            </Text>
                            <Text style={[styles.cardDesc, { color: isDark ? '#aaa' : '#7C7C80' }]}>
                                {t('batteryLowAlertDescription') || 'Alert when battery is low'}
                            </Text>
                            <Text style={[styles.statusText, { color: batteryLowAlert ? '#ED4C4C' : '#999' }]}>
                                {batteryLowAlert ? (t('enabled') || 'Enabled') : (t('off') || 'Off')}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={batteryLowAlert}
                        onValueChange={toggleBatteryLow}
                        trackColor={{ false: '#E8E8E8', true: '#FFE5E5' }}
                        thumbColor={batteryLowAlert ? '#ED4C4C' : '#fff'}
                    />
                </View>

                {/* 4. Location Off Alert */}
                <View style={[styles.card, { backgroundColor: isDark ? '#222' : '#FAFAFA' }]}>
                    <View style={styles.cardContent}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="location-outline" size={22} color="#ED4C4C" />
                        </View>
                        <View style={styles.textBox}>
                            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('locationOffAlert') || 'Location Off Alert'}
                            </Text>
                            <Text style={[styles.cardDesc, { color: isDark ? '#aaa' : '#7C7C80' }]}>
                                {t('locationOffAlertDescription') || 'Alert when location is turned off'}
                            </Text>
                            <Text style={[styles.statusText, { color: locationOffAlert ? '#ED4C4C' : '#999' }]}>
                                {locationOffAlert ? (t('enabled') || 'Enabled') : (t('off') || 'Off')}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={locationOffAlert}
                        onValueChange={toggleLocationOff}
                        trackColor={{ false: '#E8E8E8', true: '#FFE5E5' }}
                        thumbColor={locationOffAlert ? '#ED4C4C' : '#fff'}
                    />
                </View>

                {/* 5. Last Known Location */}
                <View style={[styles.card, { backgroundColor: isDark ? '#222' : '#FAFAFA' }]}>
                    <View style={styles.cardContent}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="location" size={22} color="#ED4C4C" />
                        </View>
                        <View style={styles.textBox}>
                            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
                                {t('lastKnownLocation') || 'Last Known Location'}
                            </Text>
                            <Text style={[styles.cardDesc, { color: isDark ? '#aaa' : '#7C7C80' }]}>
                                {lastKnownLocation}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 100,
    },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 18,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF2F1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    textBox: { flex: 1 },
    cardTitle: { fontSize: 16.5, fontWeight: '700' },
    cardDesc: { fontSize: 13.5, color: '#7C7C80', marginTop: 4 },
    statusText: { fontSize: 12, fontWeight: '600', marginTop: 6 },
});
