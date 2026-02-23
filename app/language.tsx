import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { setStoredLanguage } from '../i18n';

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
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en-US');
  const router = useRouter();

  const handleSave = async () => {
    await i18n.changeLanguage(selectedLanguage);
    await setStoredLanguage(selectedLanguage);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Language</Text>
        <TouchableOpacity style={styles.headerSaveButton} onPress={handleSave}>
          <Text style={styles.headerSaveText}>Change</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.languagesContainer} showsVerticalScrollIndicator={false}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageBox,
              { backgroundColor: lang.bgColor, borderColor: selectedLanguage === lang.code ? '#4caf50' : 'transparent', borderWidth: 2 },
            ]}
            onPress={() => setSelectedLanguage(lang.code)}
            activeOpacity={0.8}
          >
            <Text style={[styles.languageName, { color: lang.color }]}>{lang.name}</Text>
            <Text style={[styles.languageSubtext, { color: lang.color }]}>{lang.subtext}</Text>
            {selectedLanguage === lang.code && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 40,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#000',
  },
  headerSaveButton: {
    backgroundColor: '#ed4c4c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  headerSaveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
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
});