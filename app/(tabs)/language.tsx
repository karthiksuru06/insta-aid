import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';
import i18n, { setStoredLanguage } from '../../i18n';

type Language = {
  code: string;
  name: string;
  subtext: string;
  color: string;
  bgColor: string;
};

const languages: Language[] = [
  { code: 'en-US', name: 'English', subtext: 'English - US', color: '#d94343', bgColor: '#f9dede' },
  { code: 'kn', name: 'ಕನ್ನಡ', subtext: 'Kannada', color: '#a0a0a0', bgColor: '#f6f4f4' },
  { code: 'te', name: 'తెలుగు', subtext: 'Telugu', color: '#784fc0', bgColor: '#d8ccf6' },
  { code: 'en-UK', name: 'ENGLISH', subtext: 'ENGLISH+ UK', color: '#578474', bgColor: '#d2e5e2' },
  { code: 'hi', name: 'हिंदी', subtext: 'Hindi', color: '#5db0f0', bgColor: '#dcedff' },
  { code: 'mr', name: 'मराठी', subtext: 'Marathi', color: '#9176c0', bgColor: '#e7e0f6' },
  { code: 'gu', name: 'ગુજરાતી', subtext: 'Gujarati', color: '#58af71', bgColor: '#dbefe2' },
  { code: 'ta', name: 'தமிழ்', subtext: 'Tamil', color: '#f1bc8a', bgColor: '#fae6d1' },
  { code: 'bn', name: 'বাংলা', subtext: 'Bangla', color: '#ac9a92', bgColor: '#f2ebe8' },
  { code: 'ml', name: 'മലയാളം', subtext: 'Malayalam', color: '#ca9ef4', bgColor: '#f1e1ff' },
];

export default function Languages() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en-US');

  const handleChangeLanguage = async () => {
    await i18n.changeLanguage(selectedLanguage);
    await setStoredLanguage(selectedLanguage);
    router.back();
  };

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 40,
      backgroundColor: theme === "dark" ? "#111" : "#FFFFFF",
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      marginTop: 10,
    },
    backButton: {
      marginRight: 10,
      padding: 5,
    },
    headerTitle: {
      fontWeight: 'bold',
      fontSize: 20,
      color: theme === "dark" ? "#fff" : "#000",
      flex: 1,
      textAlign: 'center',
      marginRight: 40, // Balance the back button for visuals
    },
    languagesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingBottom: 20,
    },
    languageBox: {
      width: '47%',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 6,
      marginBottom: 12,
      borderWidth: 2,
      position: 'relative',
    },
    languageName: {
      fontWeight: '700',
      fontSize: 16,
      marginBottom: 4,
    },
    languageSubtext: {
      fontWeight: '400',
      fontSize: 12,
    },
    checkmark: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      backgroundColor: '#4caf50',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footer: {
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: theme === "dark" ? "#333" : "#eee",
      marginBottom: 10,
    },
    changeButton: {
      backgroundColor: '#ED4C4C', // Red Request
      paddingVertical: 15,
      borderRadius: 10,
      alignItems: 'center',
      shadowColor: '#ED4C4C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 4,
    },
    changeButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
  }), [theme]);

  // Handle case where headerTitle needs to be centered but back button is left
  // We can just use standard row with title, or absolute position title.
  // Above dynamicStyles uses flex:1 and textAlign:center.

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme === "dark" ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>{t('selectLanguage') || "Select Your Language"}</Text>
      </View>

      <ScrollView contentContainerStyle={dynamicStyles.languagesContainer} showsVerticalScrollIndicator={false}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              dynamicStyles.languageBox,
              { backgroundColor: lang.bgColor, borderColor: selectedLanguage === lang.code ? '#4caf50' : 'transparent' },
            ]}
            onPress={() => setSelectedLanguage(lang.code)}
            activeOpacity={0.8}
          >
            <Text style={[dynamicStyles.languageName, { color: lang.color }]}>{lang.name}</Text>
            <Text style={[dynamicStyles.languageSubtext, { color: lang.color }]}>{lang.subtext}</Text>
            {selectedLanguage === lang.code && (
              <View style={dynamicStyles.checkmark}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer / Change Button */}
      <View style={dynamicStyles.footer}>
        <TouchableOpacity style={dynamicStyles.changeButton} onPress={handleChangeLanguage}>
          <Text style={dynamicStyles.changeButtonText}>{t('change') || "Change Language"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}