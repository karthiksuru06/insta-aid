import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Vibration } from 'react-native';
import { dismissNotification, showOngoingCallNotification } from '../services/fakeCallNotificationService';

/* ---------------- PERSISTENCE KEYS ---------------- */
const ACTIVE_CALL_KEY = 'fake-call-active-state';

/* ---------------- AUDIO FILES ---------------- */
const VOICE_MAP: Record<string, any> = {
  brother: require('../assets/callerVoices/brother.mp3'),
  police: require('../assets/callerVoices/police.mp3'),
  delivery: require('../assets/callerVoices/delivery.mp3'),
  principal: require('../assets/callerVoices/principal.mp3'),
  doctor: require('../assets/callerVoices/principal.mp3'), // fallback for 0-byte doctor.mp3
  unknown: require('../assets/callerVoices/unknown.mp3'),
};

const ALL_VOICES = Array.from(new Set(Object.values(VOICE_MAP)));
const RINGTONE = require('../assets/callerVoices/default.mp3');

// Persist last-played voice across component mounts
let lastVoiceIndex: number | null = null;

/* ---------------- TYPES ---------------- */
export type CallState = 'idle' | 'incoming' | 'active' | 'ended';

export type Caller = {
  id: string;
  name: string;
  avatar: string;
  voiceType: string;
};

export type ActiveCall = {
  callerName: string;
  avatar: string;
  voiceType: string;
  startTime: Date;
  isMuted: boolean;
  isSpeakerOn: boolean;
  callDuration: number;
};

export type ScheduledCall = {
  id: string;
  caller: Caller;
  scheduledTime: Date;
  message?: string;
  notificationId: string;
};

type FakeCallContextType = {
  callState: CallState;
  activeCall: ActiveCall | null;
  triggerFakeCall: (caller: Caller) => Promise<void>;
  answerCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => Promise<void>;
  scheduleCall: (caller: Caller, scheduledTime: Date, message?: string) => Promise<void>;
  cancelScheduledCall: (callId: string) => Promise<void>;
  getScheduledCalls: () => Promise<ScheduledCall[]>;
  updateCallDuration: (duration: number) => void;
  playRingtone: () => Promise<void>;
  playCallerVoice: () => Promise<void>;
  stopAudio: () => Promise<void>;
  startCallTimer: (callerName: string) => void;
  stopCallTimer: () => void;
  formatDuration: (seconds: number) => string;
};

/* ---------------- CONTEXT ---------------- */
const FakeCallContext = createContext<FakeCallContextType | undefined>(undefined);

/* ---------------- PROVIDER ---------------- */
export function FakeCallProvider({ children }: { children: ReactNode }) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const ongoingNotificationId = useRef<string | null>(null);
  const soundRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const notificationUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRingtonePlaying = useRef<boolean>(false);
  const audioLock = useRef<boolean>(false);

  /* ---------------- FORMAT DURATION ---------------- */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /* ---------------- RANDOM VOICE (NO REPEAT) ---------------- */
  const getRandomVoice = () => {
    let index;
    do {
      index = Math.floor(Math.random() * ALL_VOICES.length);
    } while (ALL_VOICES.length > 1 && index === lastVoiceIndex);
    lastVoiceIndex = index;
    return ALL_VOICES[index];
  };

  /* ---------------- AUDIO MANAGEMENT (SERIALIZED) ---------------- */
  const waitForAudioLock = async () => {
    let attempts = 0;
    while (audioLock.current && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }
  };

  const stopAudio = async () => {
    await waitForAudioLock();
    audioLock.current = true;
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        console.log('[FAKE CALL CONTEXT] Audio stopped');
      }
      isRingtonePlaying.current = false;
    } catch (error) {
      console.error('[FAKE CALL CONTEXT] Error stopping audio:', error);
      soundRef.current = null;
      isRingtonePlaying.current = false;
    } finally {
      audioLock.current = false;
    }
  };

  const playRingtone = async () => {
    // Idempotency guard - skip if ringtone is already playing
    if (isRingtonePlaying.current) {
      console.log('[FAKE CALL CONTEXT] Ringtone already playing, skipping');
      return;
    }

    await waitForAudioLock();
    audioLock.current = true;
    try {
      // Stop any existing audio inline (don't call stopAudio to avoid lock re-entry)
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(RINGTONE, {
        shouldPlay: true,
        isLooping: true,
        volume: 1,
      });

      soundRef.current = sound;
      isRingtonePlaying.current = true;

      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 500, 200, 500], true);
      }

      console.log('[FAKE CALL CONTEXT] Playing ringtone (looping)');
    } catch (error) {
      console.error('[FAKE CALL CONTEXT] Error playing ringtone:', error);
      isRingtonePlaying.current = false;
    } finally {
      audioLock.current = false;
    }
  };

  const playCallerVoice = async (specificVoice?: string) => {
    await waitForAudioLock();
    audioLock.current = true;
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      isRingtonePlaying.current = false;
      Vibration.cancel();

      let file;
      const voiceToPlay = specificVoice || activeCall?.voiceType;

      if (voiceToPlay && VOICE_MAP[voiceToPlay]) {
        console.log(`[FAKE CALL CONTEXT] Playing specific voice: ${voiceToPlay}`);
        file = VOICE_MAP[voiceToPlay];
      } else {
        console.log('[FAKE CALL CONTEXT] Playing random voice');
        file = getRandomVoice();
      }

      const { sound } = await Audio.Sound.createAsync(file, {
        shouldPlay: true,
        isLooping: true,
        volume: 1,
      });

      soundRef.current = sound;
      console.log('[FAKE CALL CONTEXT] Playing caller voice (looping)');
    } catch (error) {
      console.error('[FAKE CALL CONTEXT] Error playing caller voice:', error);
    } finally {
      audioLock.current = false;
    }
  };

  /* ---------------- TIMER MANAGEMENT ---------------- */
  const startCallTimer = (callerName: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    console.log('[FAKE CALL CONTEXT] Starting call timer');

    // Start duration timer (increments every second)
    timerRef.current = setInterval(() => {
      setActiveCall((prev) => {
        if (!prev) return prev;
        const newDuration = prev.callDuration + 1;
        return { ...prev, callDuration: newDuration };
      });
    }, 1000);

    // Update notification every 5 seconds
    notificationUpdateTimerRef.current = setInterval(async () => {
      try {
        if (ongoingNotificationId.current && activeCall) {
          await dismissNotification(ongoingNotificationId.current);
          const notificationId = await showOngoingCallNotification(
            callerName,
            formatDuration(activeCall.callDuration)
          );
          ongoingNotificationId.current = notificationId;
        }
      } catch (error) {
        console.error('[FAKE CALL CONTEXT] Error updating notification:', error);
      }
    }, 5000);
  };

  const stopCallTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      console.log('[FAKE CALL CONTEXT] Call timer stopped');
    }

    if (notificationUpdateTimerRef.current) {
      clearInterval(notificationUpdateTimerRef.current);
      notificationUpdateTimerRef.current = null;
      console.log('[FAKE CALL CONTEXT] Notification update timer stopped');
    }
  };

  /* ---------------- TRIGGER FAKE CALL ---------------- */
  const triggerFakeCall = async (caller: Caller) => {
    try {
      // If already in a call, ignore
      if (callState !== 'idle') {
        console.log('[FAKE CALL] Already in a call, ignoring trigger');
        return;
      }

      const startTime = new Date();
      const callData = {
        callerName: caller.name,
        avatar: caller.avatar,
        voiceType: caller.voiceType,
        startTime,
        isMuted: false,
        isSpeakerOn: false,
        callDuration: 0,
        callState: 'incoming' as CallState,
      };

      // Persist to AsyncStorage
      await AsyncStorage.setItem(ACTIVE_CALL_KEY, JSON.stringify({
        ...callData,
        startTime: startTime.toISOString(),
      }));

      // Set incoming state
      setCallState('incoming');
      setActiveCall(callData);

      // NOTE: No immediate notification here - FakeCall.tsx already navigates
      // directly to CallScreen. Scheduling an immediate notification would cause
      // double navigation from _layout.tsx notification handler.

      console.log('[FAKE CALL] Triggered incoming call from', caller.name);
    } catch (error) {
      console.error('[FAKE CALL] Error triggering fake call:', error);
    }
  };

  /* ---------------- ANSWER CALL ---------------- */
  const answerCall = async () => {
    if (callState !== 'incoming') {
      console.log('[FAKE CALL CONTEXT] Cannot answer - call state is:', callState);
      return;
    }

    console.log('[FAKE CALL CONTEXT] Answering call');

    // CRITICAL: Stop ringtone completely before transitioning
    await stopAudio();
    Vibration.cancel();
    isRingtonePlaying.current = false;
    soundRef.current = null; // Force null as safety

    setCallState('active');

    if (activeCall) {
      const updatedCall = {
        ...activeCall,
        startTime: new Date(), // Reset start time when call is answered
        callDuration: 0,
      };
      setActiveCall(updatedCall);

      // Start caller voice playback (ringtone is guaranteed stopped)
      await playCallerVoice(updatedCall.voiceType);

      // Start timer and notification
      startCallTimer(updatedCall.callerName);

      // Show ongoing notification
      const notificationId = await showOngoingCallNotification(
        updatedCall.callerName,
        formatDuration(0)
      );
      ongoingNotificationId.current = notificationId;

      // Update persisted state
      try {
        const saved = await AsyncStorage.getItem(ACTIVE_CALL_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          data.callState = 'active';
          data.startTime = updatedCall.startTime.toISOString();
          await AsyncStorage.setItem(ACTIVE_CALL_KEY, JSON.stringify(data));
        }
      } catch (error) {
        console.error('[FAKE CALL CONTEXT] Error persisting answer state:', error);
      }
    }

    console.log('[FAKE CALL CONTEXT] Call answered successfully');
  };

  /* ---------------- END CALL ---------------- */
  const endCall = async () => {
    try {
      console.log('[FAKE CALL CONTEXT] Ending call');

      // Stop audio
      await stopAudio();
      Vibration.cancel();

      // Stop timer
      stopCallTimer();

      // Dismiss ongoing notification if exists
      if (ongoingNotificationId.current) {
        await dismissNotification(ongoingNotificationId.current);
        ongoingNotificationId.current = null;
      }

      // Dismiss all pending notifications
      await Notifications.dismissAllNotificationsAsync();

      // Clear persisted state
      await AsyncStorage.removeItem(ACTIVE_CALL_KEY);

      setCallState('ended');

      // Clear active call after a short delay
      setTimeout(() => {
        setCallState('idle');
        setActiveCall(null);
      }, 500);

      console.log('[FAKE CALL CONTEXT] Call ended successfully');
    } catch (error) {
      console.error('[FAKE CALL CONTEXT] Error ending call:', error);
    }
  };

  /* ---------------- TOGGLE MUTE ---------------- */
  const toggleMute = () => {
    if (!activeCall) return;

    const newMutedState = !activeCall.isMuted;

    setActiveCall({
      ...activeCall,
      isMuted: newMutedState,
    });

    // Persist state
    const persistState = async () => {
      try {
        const saved = await AsyncStorage.getItem(ACTIVE_CALL_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          data.isMuted = newMutedState;
          await AsyncStorage.setItem(ACTIVE_CALL_KEY, JSON.stringify(data));
        }
      } catch (error) {
        console.error('[FAKE CALL] Error persisting mute state:', error);
      }
    };
    persistState();

    console.log('[FAKE CALL] Mute toggled:', newMutedState);
  };

  /* ---------------- TOGGLE SPEAKER ---------------- */
  const toggleSpeaker = async () => {
    if (!activeCall) return;

    const newSpeakerState = !activeCall.isSpeakerOn;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: 2,
        interruptionModeAndroid: 1,
        shouldDuckAndroid: !newSpeakerState,
      });

      setActiveCall({
        ...activeCall,
        isSpeakerOn: newSpeakerState,
      });

      // Persist state
      const saved = await AsyncStorage.getItem(ACTIVE_CALL_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        data.isSpeakerOn = newSpeakerState;
        await AsyncStorage.setItem(ACTIVE_CALL_KEY, JSON.stringify(data));
      }

      console.log('[FAKE CALL] Speaker toggled:', newSpeakerState);
    } catch (error) {
      console.error('[FAKE CALL] Error toggling speaker:', error);
    }
  };

  /* ---------------- UPDATE CALL DURATION ---------------- */
  const updateCallDuration = (duration: number) => {
    if (!activeCall) return;

    setActiveCall({
      ...activeCall,
      callDuration: duration,
    });
  };

  /* ---------------- SCHEDULE CALL ---------------- */
  const scheduleCall = async (
    caller: Caller,
    scheduledTime: Date,
    message?: string
  ): Promise<void> => {
    try {
      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: caller.name,
          body: message || 'Incoming call...',
          sound: 'default.mp3',
          data: {
            type: 'fake-call-scheduled',
            caller: JSON.stringify(caller),
          },
        },
        trigger: {
          date: scheduledTime,
        } as any,
      });

      // Generate unique ID for scheduled call
      const scheduledCallId = `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store in AsyncStorage
      const scheduled: ScheduledCall = {
        id: scheduledCallId,
        caller,
        scheduledTime,
        message,
        notificationId,
      };

      await AsyncStorage.setItem(
        `fake-call-scheduled-${scheduledCallId}`,
        JSON.stringify(scheduled)
      );

      console.log('[FAKE CALL] Scheduled call for', scheduledTime, 'with ID:', scheduledCallId);
    } catch (error) {
      console.error('[FAKE CALL] Error scheduling call:', error);
      throw error;
    }
  };

  /* ---------------- CANCEL SCHEDULED CALL ---------------- */
  const cancelScheduledCall = async (callId: string): Promise<void> => {
    try {
      // Get scheduled call from storage
      const storedData = await AsyncStorage.getItem(`fake-call-scheduled-${callId}`);
      if (!storedData) {
        console.log('[FAKE CALL] Scheduled call not found:', callId);
        return;
      }

      const scheduled: ScheduledCall = JSON.parse(storedData);

      // Cancel the notification
      await Notifications.cancelScheduledNotificationAsync(scheduled.notificationId);

      // Remove from storage
      await AsyncStorage.removeItem(`fake-call-scheduled-${callId}`);

      console.log('[FAKE CALL] Cancelled scheduled call:', callId);
    } catch (error) {
      console.error('[FAKE CALL] Error cancelling scheduled call:', error);
      throw error;
    }
  };

  /* ---------------- GET SCHEDULED CALLS ---------------- */
  const getScheduledCalls = async (): Promise<ScheduledCall[]> => {
    try {
      // Get all keys from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const scheduledKeys = allKeys.filter((key) => key.startsWith('fake-call-scheduled-'));

      // Get all scheduled calls
      const scheduledCalls: ScheduledCall[] = [];

      for (const key of scheduledKeys) {
        const storedData = await AsyncStorage.getItem(key);
        if (storedData) {
          const scheduled: ScheduledCall = JSON.parse(storedData);

          // Check if scheduled time has passed
          const scheduledTime = new Date(scheduled.scheduledTime);
          if (scheduledTime > new Date()) {
            scheduledCalls.push(scheduled);
          } else {
            // Remove expired scheduled calls
            await AsyncStorage.removeItem(key);
          }
        }
      }

      // Sort by scheduled time (earliest first)
      scheduledCalls.sort((a, b) =>
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
      );

      return scheduledCalls;
    } catch (error) {
      console.error('[FAKE CALL] Error getting scheduled calls:', error);
      return [];
    }
  };

  /* ---------------- INITIALIZE AUDIO MODE ---------------- */
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: 2,
          interruptionModeAndroid: 1,
          shouldDuckAndroid: true,
        });
        console.log('[FAKE CALL CONTEXT] Audio mode initialized');
      } catch (error) {
        console.error('[FAKE CALL CONTEXT] Error initializing audio:', error);
      }
    };

    initAudio();

    // Cleanup on unmount
    return () => {
      stopAudio();
      stopCallTimer();
      Vibration.cancel();
    };
  }, []);

  /* ---------------- RESTORE CALL STATE ON MOUNT ---------------- */
  useEffect(() => {
    const restoreCallState = async () => {
      try {
        const saved = await AsyncStorage.getItem(ACTIVE_CALL_KEY);
        if (saved) {
          const data = JSON.parse(saved);

          // Only restore if call was active
          if (data.callState === 'active') {
            const startTime = new Date(data.startTime);
            const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);

            const restoredCall: ActiveCall = {
              ...data,
              startTime,
              callDuration: elapsed,
            };

            setActiveCall(restoredCall);
            setCallState('active');

            // Resume audio playback
            await playCallerVoice();

            // Resume timer from current duration
            startCallTimer(restoredCall.callerName);

            // Show ongoing notification
            const notificationId = await showOngoingCallNotification(
              restoredCall.callerName,
              formatDuration(elapsed),
              startTime.toISOString()
            );
            ongoingNotificationId.current = notificationId;

            console.log('[FAKE CALL CONTEXT] Restored active call state. Elapsed:', elapsed, 'seconds');
          } else {
            console.log('[FAKE CALL CONTEXT] Found saved call state but not active:', data.callState);
          }
        }
      } catch (error) {
        console.error('[FAKE CALL CONTEXT] Error restoring state:', error);
      }
    };
    restoreCallState();
  }, []);

  /* ---------------- CONTEXT VALUE ---------------- */
  const value: FakeCallContextType = {
    callState,
    activeCall,
    triggerFakeCall,
    answerCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    scheduleCall,
    cancelScheduledCall,
    getScheduledCalls,
    updateCallDuration,
    playRingtone,
    playCallerVoice,
    stopAudio,
    startCallTimer,
    stopCallTimer,
    formatDuration,
  };

  return (
    <FakeCallContext.Provider value={value}>
      {children}
    </FakeCallContext.Provider>
  );
}

/* ---------------- HOOK ---------------- */
export function useFakeCall() {
  const context = useContext(FakeCallContext);
  if (!context) {
    throw new Error('useFakeCall must be used within a FakeCallProvider');
  }
  return context;
}
