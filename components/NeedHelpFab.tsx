import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';

const NeedHelpFab = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { theme } = useTheme();

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => router.push('/chat/live-chat')}
            activeOpacity={0.8}
        >
            <View style={[styles.button, { backgroundColor: '#FF5C62' }]}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
            </View>
            <Text style={[styles.text, { color: theme === 'dark' ? '#fff' : '#333' }]}>
                {t('needHelp') || 'Need help?'}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 80, // Adjusted to be above tab bar
        right: 20,
        alignItems: 'center',
        zIndex: 9999,
    },
    button: {
        width: 50,
        height: 50,
        borderRadius: 25, // Circle
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 }, // Deeper shadow in image?
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    text: {
        fontSize: 12, // Reduced size
        fontWeight: '600',
        fontStyle: 'italic', // "Need help?" looks slanted? Maybe.
        marginTop: 4,
    }
});

export default NeedHelpFab;
