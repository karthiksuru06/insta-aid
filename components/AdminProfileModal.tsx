import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';

interface AdminProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function AdminProfileModal({ visible, onClose }: AdminProfileModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            loadProfile();
        }
    }, [visible]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const currentUser = auth.currentUser;

            if (!currentUser) {
                // If not logged in, maybe redirect or just close
                onClose();
                router.replace('/Login');
                return;
            }

            const email = currentUser.email;
            if (!email) {
                setUserData({
                    name: currentUser.displayName ?? 'Admin',
                    email: '',
                    phone: '',
                });
                setLoading(false);
                return;
            }

            const docRef = doc(db, 'admin', email);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const data = snap.data();
                setUserData({
                    name: data.name ?? currentUser.displayName ?? 'Admin',
                    email: email,
                    phone: data.phone ?? '',
                    gender: data.gender ?? '',
                    address: data.address ?? '',
                    role: data.role ?? 'admin',
                });
            } else {
                setUserData({
                    name: currentUser.displayName ?? 'Admin',
                    email: email,
                    phone: '',
                    gender: '',
                    address: '',
                });
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load admin profile');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Sign out', 'Do you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign out',
                style: 'destructive',
                onPress: async () => {
                    try {
                        if (auth.currentUser) {
                            // Dynamically import to avoid cycles or ensure fresh ref
                            const { logUserActivity } = require('../services/firebaseServices');
                            await logUserActivity(auth.currentUser.uid, 'USER_LOGOUT');
                        }
                    } catch (err) {
                        console.log("Logout Log Error:", err);
                    }

                    onClose();
                    await signOut(auth);

                    // Reset to Login (use replace to kill history stack if possible, or push)
                    router.replace('/Login');
                },
            },
        ]);
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                {/* This TouchableOpacity allows closing by clicking outside the modal content */}
                <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1} />

                <View style={styles.modalContent}>
                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#ED4C4C" />
                        </View>
                    ) : error ? (
                        <View style={styles.center}>
                            <Text style={{ color: '#f00' }}>{error}</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Text style={{ color: '#ED4C4C', marginTop: 12 }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {/* Header inside Modal */}
                            <View style={styles.header}>
                                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                                    <Ionicons name="chevron-back" size={24} color="#333" />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>Admin Details</Text>
                            </View>

                            <View style={styles.detailsContainer}>
                                {/* Name */}
                                <View style={styles.rowCard}>
                                    <View style={styles.iconBox}>
                                        <Ionicons name="person" size={22} color="#ED4C4C" />
                                    </View>
                                    <View style={styles.textBox}>
                                        <Text style={styles.label}>Name</Text>
                                        <Text style={styles.value}>
                                            {userData?.name ?? 'Unnamed Admin'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Email */}
                                <View style={styles.rowCard}>
                                    <View style={styles.iconBox}>
                                        <MaterialCommunityIcons
                                            name="email-outline"
                                            size={22}
                                            color="#ED4C4C"
                                        />
                                    </View>
                                    <View style={styles.textBox}>
                                        <Text style={styles.label}>Email</Text>
                                        <Text style={styles.value}>{userData?.email ?? '-'}</Text>
                                    </View>
                                </View>

                                {/* Phone number */}
                                <View style={styles.rowCard}>
                                    <View style={styles.iconBox}>
                                        <Ionicons name="call-outline" size={22} color="#ED4C4C" />
                                    </View>
                                    <View style={styles.textBox}>
                                        <Text style={styles.label}>Phone number</Text>
                                        <Text style={styles.value}>
                                            {userData?.phone || '+91XXXXXXXXXX'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Bottom buttons */}
                                <View style={styles.buttonRow}>
                                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                                        <Text style={styles.logoutText}>Logout</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // Dim background
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayTouch: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    center: {
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
    },
    backButton: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    detailsContainer: {
        //
    },
    rowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
        backgroundColor: '#FAFAFA',
    },
    iconBox: {
        width: 35,
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: '#FFE2E2', // matching the dashboard icon bg
        height: 35,
        borderRadius: 17.5,
        justifyContent: 'center',
    },
    textBox: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#888',
        marginBottom: 2,
    },
    value: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    buttonRow: {
        marginTop: 20,
    },
    logoutBtn: {
        borderRadius: 12,
        backgroundColor: '#D32F2F', // matching new darker red
        paddingVertical: 14,
        alignItems: 'center',
    },
    logoutText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
});