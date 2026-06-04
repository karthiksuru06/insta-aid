import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/* ---------------- NOTIFICATION CHANNELS ---------------- */
const INCOMING_CALL_CHANNEL = {
  id: 'fake-call-incoming',
  name: 'Incoming Calls',
  description: 'Notifications for incoming fake calls',
  importance: Notifications.AndroidImportance.MAX,
  sound: 'default.mp3',
  vibrationPattern: [0, 500, 200, 500],
  enableVibrate: true,
  enableLights: true,
  lightColor: '#FF0000',
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
};

const ONGOING_CALL_CHANNEL = {
  id: 'fake-call-ongoing',
  name: 'Ongoing Calls',
  description: 'Persistent notification for active calls',
  importance: Notifications.AndroidImportance.LOW,
  sound: null,
  vibrationPattern: null,
  enableVibrate: false,
};

/* ---------------- INITIALIZE NOTIFICATION CHANNELS ---------------- */
export async function initializeFakeCallNotifications() {
  try {
    if (Platform.OS === 'android') {
      // Create incoming call channel
      await Notifications.setNotificationChannelAsync(
        INCOMING_CALL_CHANNEL.id,
        {
          name: INCOMING_CALL_CHANNEL.name,
          description: INCOMING_CALL_CHANNEL.description,
          importance: INCOMING_CALL_CHANNEL.importance,
          sound: INCOMING_CALL_CHANNEL.sound,
          vibrationPattern: INCOMING_CALL_CHANNEL.vibrationPattern,
          enableVibrate: INCOMING_CALL_CHANNEL.enableVibrate,
          enableLights: INCOMING_CALL_CHANNEL.enableLights,
          lightColor: INCOMING_CALL_CHANNEL.lightColor,
          lockscreenVisibility: INCOMING_CALL_CHANNEL.lockscreenVisibility,
        }
      );

      // Create ongoing call channel
      await Notifications.setNotificationChannelAsync(
        ONGOING_CALL_CHANNEL.id,
        {
          name: ONGOING_CALL_CHANNEL.name,
          description: ONGOING_CALL_CHANNEL.description,
          importance: ONGOING_CALL_CHANNEL.importance,
        }
      );

      console.log('[FAKE CALL] Notification channels initialized');
    }

    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        const type = data?.type;

        // Handle incoming call notifications differently
        if (type === 'fake-call-incoming' || type === 'fake-call-scheduled') {
          return {
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            priority: Notifications.AndroidNotificationPriority.MAX,
          };
        }

        // Default behavior for ongoing call notifications
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      },
    });
  } catch (error) {
    console.error('[FAKE CALL] Error initializing notifications:', error);
  }
}

/* ---------------- SHOW INCOMING CALL NOTIFICATION ---------------- */
export async function showIncomingCallNotification(
  callerName: string,
  callerAvatar?: string,
  callStartTime?: string
): Promise<string> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: callerName,
        body: 'Incoming call...',
        sound: 'default.mp3',
        data: {
          type: 'fake-call-incoming',
          callerName,
          callerAvatar,
          callStartTime: callStartTime || new Date().toISOString(),
          screen: 'CallScreen',
        },
        ...Platform.select({
          android: {
            channelId: INCOMING_CALL_CHANNEL.id,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: INCOMING_CALL_CHANNEL.vibrationPattern,
            category: 'call',
            actions: [
              {
                identifier: 'decline',
                buttonTitle: '📞 Decline',
                options: {
                  opensAppToForeground: false,
                },
              },
              {
                identifier: 'answer',
                buttonTitle: '✅ Answer',
                options: {
                  opensAppToForeground: true,
                },
              },
            ],
          },
          ios: {
            sound: 'default.mp3',
            categoryIdentifier: 'FAKE_CALL_INCOMING',
          },
        }),
      },
      trigger: null, // Show immediately
    });

    console.log('[FAKE CALL] Incoming call notification shown:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[FAKE CALL] Error showing incoming call notification:', error);
    throw error;
  }
}

/* ---------------- SHOW ONGOING CALL NOTIFICATION ---------------- */
export async function showOngoingCallNotification(
  callerName: string,
  callDuration: string,
  callStartTime?: string
): Promise<string> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Call with ${callerName}`,
        body: `Ongoing - ${callDuration}`,
        data: {
          type: 'fake-call-ongoing',
          callerName,
          callDuration,
          callStartTime: callStartTime || new Date().toISOString(),
          screen: 'CallScreen',
        },
        ...Platform.select({
          android: {
            channelId: ONGOING_CALL_CHANNEL.id,
            priority: Notifications.AndroidNotificationPriority.LOW,
            ongoing: true,
            autoCancel: false,
            actions: [
              {
                identifier: 'end-call',
                buttonTitle: '❌ End Call',
                options: {
                  opensAppToForeground: false,
                },
              },
            ],
          },
          ios: {
            categoryIdentifier: 'FAKE_CALL_ONGOING',
          },
        }),
        sticky: true,
      },
      trigger: null,
    });

    console.log('[FAKE CALL] Ongoing call notification shown:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[FAKE CALL] Error showing ongoing call notification:', error);
    throw error;
  }
}

/* ---------------- UPDATE ONGOING CALL NOTIFICATION ---------------- */
export async function updateOngoingCallNotification(
  notificationId: string,
  callerName: string,
  callDuration: string
): Promise<void> {
  try {
    // Dismiss previous notification
    await Notifications.dismissNotificationAsync(notificationId);

    // Show updated notification
    await showOngoingCallNotification(callerName, callDuration);
  } catch (error) {
    console.error('[FAKE CALL] Error updating ongoing call notification:', error);
  }
}

/* ---------------- DISMISS NOTIFICATION ---------------- */
export async function dismissNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(notificationId);
    console.log('[FAKE CALL] Notification dismissed:', notificationId);
  } catch (error) {
    console.error('[FAKE CALL] Error dismissing notification:', error);
  }
}

/* ---------------- DISMISS ALL FAKE CALL NOTIFICATIONS ---------------- */
export async function dismissAllFakeCallNotifications(): Promise<void> {
  try {
    // Get all presented notifications
    const notifications = await Notifications.getPresentedNotificationsAsync();

    // Filter and dismiss fake call notifications
    for (const notification of notifications) {
      const data = notification.request.content.data;
      const type = data?.type;

      if (
        type === 'fake-call-incoming' ||
        type === 'fake-call-ongoing' ||
        type === 'fake-call-scheduled'
      ) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }

    console.log('[FAKE CALL] All fake call notifications dismissed');
  } catch (error) {
    console.error('[FAKE CALL] Error dismissing all notifications:', error);
  }
}

/* ---------------- REQUEST NOTIFICATION PERMISSIONS ---------------- */
export async function requestFakeCallNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: false,
          allowSound: true,
          
          allowCriticalAlerts: true, // For realistic call notifications on iOS
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[FAKE CALL] Notification permission not granted');
      return false;
    }

    console.log('[FAKE CALL] Notification permissions granted');
    return true;
  } catch (error) {
    console.error('[FAKE CALL] Error requesting notification permissions:', error);
    return false;
  }
}

/* ---------------- REGISTER NOTIFICATION CATEGORIES (iOS) ---------------- */
export async function registerNotificationCategories(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('FAKE_CALL_INCOMING', [
        {
          identifier: 'decline',
          buttonTitle: 'Decline',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'answer',
          buttonTitle: 'Answer',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('FAKE_CALL_ONGOING', [
        {
          identifier: 'end-call',
          buttonTitle: 'End Call',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      console.log('[FAKE CALL] iOS notification categories registered');
    }
  } catch (error) {
    console.error('[FAKE CALL] Error registering notification categories:', error);
  }
}
