import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import ChatHelpButton from "../components/ChatHelpButton";
import { ThemeProvider } from "../components/ThemeContext";
import { AnnouncementProvider } from "../contexts/AnnouncementContext";
import { FakeCallProvider, useFakeCall } from "../contexts/FakeCallContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import i18n from "../i18n";
import {
  initializeFakeCallNotifications,
  registerNotificationCategories,
  requestFakeCallNotificationPermissions,
} from "../services/fakeCallNotificationService";
import { ShakeDetectionProvider } from '../components/ShakeDetectionContext';

// Notification listener component
function NotificationListener() {
  const router = useRouter();
  const { answerCall, endCall } = useFakeCall();

  useEffect(() => {
    // Initialize fake call notifications
    initializeFakeCallNotifications();
    registerNotificationCategories();
    requestFakeCallNotificationPermissions();

    // Check for pending notification response on app launch (when app was killed)
    Notifications.getLastNotificationResponseAsync()
      .then(async (response) => {
        if (response) {
          const actionId = response.actionIdentifier;
          const data = response.notification.request.content.data;

          // Ignore stale notifications - only handle if callStartTime is within last 2 minutes
          const callStartTime = data?.callStartTime;
          if (callStartTime) {
            const age = Date.now() - new Date(callStartTime).getTime();
            if (age > 2 * 60 * 1000) {
              console.log('[FAKE CALL] Ignoring stale notification (age:', Math.round(age / 1000), 'seconds)');
              return;
            }
          }

          console.log('[FAKE CALL] App launched from notification:', actionId, data);

          // Handle notification response from killed app state
          if (actionId === 'answer') {
            console.log('[FAKE CALL] App launched from "Answer" action');
            await answerCall();
            router.push('/(tabs)/CallScreen');
          } else if (data?.type === 'fake-call-ongoing') {
            // Don't navigate here - FakeCallContext's restore effect handles this
            console.log('[FAKE CALL] Ongoing call will be restored by context');
          } else if (data?.type === 'fake-call-incoming' || data?.type === 'fake-call-scheduled') {
            console.log('[FAKE CALL] App launched from incoming notification tap');
            router.push('/(tabs)/CallScreen');
          }
        }
      })
      .catch(error => {
        console.error('[FAKE CALL] Error checking last notification:', error);
      });

    // Listen for notification responses (user tapping notification actions)
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data;

        console.log('[FAKE CALL] Notification response:', actionId, data);

        // Handle incoming call actions
        if (actionId === 'answer') {
          // Answer incoming call and navigate
          console.log('[FAKE CALL] Answering call and navigating to CallScreen');
          await answerCall();
          router.push('/(tabs)/CallScreen');
        } else if (actionId === 'decline') {
          console.log('[FAKE CALL] Declining call');
          await endCall();
        } else if (actionId === 'end-call') {
          console.log('[FAKE CALL] Ending call from notification');
          await endCall();
        } else if (data?.type === 'fake-call-ongoing') {
          // Tapped ongoing notification - just navigate (call is already active)
          console.log('[FAKE CALL] Navigating back to active call from ongoing notification');
          router.push('/(tabs)/CallScreen');
        } else if (
          data?.type === 'fake-call-incoming' ||
          data?.type === 'fake-call-scheduled'
        ) {
          // Tapped incoming call notification - go to call screen
          console.log('[FAKE CALL] Opening incoming call from notification');
          router.push('/(tabs)/CallScreen');
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [router, answerCall, endCall]);

  return null;
}

export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <NotificationProvider>
          <AnnouncementProvider>
            <ShakeDetectionProvider>
              <FakeCallProvider>
                <NotificationListener />
                <Stack
                  screenOptions={{ headerShown: false }}
                  initialRouteName="auth"
                >
                  {/* Auth group (SplashScreen, welcome, second, Privacypage) */}
                  <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="Login" />
                  <Stack.Screen name="Signup" />
                  <Stack.Screen name="ForgotPassword" />
                  <Stack.Screen name="index" />

                  {/* Onboarding/Features group */}
                  <Stack.Screen name="features" />

                  {/* Chat group */}
                  <Stack.Screen name="chat" />

                  {/* Main app with bottom nav */}
                  <Stack.Screen name="(tabs)" />
                </Stack>

              </FakeCallProvider>
            </ShakeDetectionProvider>
          </AnnouncementProvider>
        </NotificationProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
