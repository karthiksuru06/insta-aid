// App.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// Keep the splash screen visible while we load resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🚀 [APP] Initializing app...');
        
        // Load saved language from AsyncStorage
        try {
          const savedLng = await AsyncStorage.getItem('appLanguage');
          if (savedLng) {
            console.log('🌐 [APP] Changing language to:', savedLng);
            await i18n.changeLanguage(savedLng);
          }
        } catch (err) {
          console.error('❌ [APP] Error loading language:', err);
        }

        console.log('✅ [APP] Initialization complete');
      } catch (err) {
        console.error('❌ [APP] Error during initialization:', err);
      } finally {
        // Always hide splash screen after a short delay
        try {
          await SplashScreen.hideAsync();
        } catch (err) {
          console.error('❌ [APP] Error hiding splash screen:', err);
        }
      }
    };

    initApp();
  }, []);

  console.log('🎨 [APP] Rendering app');
  return (
    <I18nextProvider i18n={i18n}>
      <Slot />
    </I18nextProvider>
  );
}

