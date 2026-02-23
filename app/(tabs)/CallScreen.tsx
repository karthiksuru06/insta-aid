import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  Vibration,
  AppState,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Audio } from "expo-av";
import { useTheme } from "../../components/ThemeContext";
import { useFakeCall } from "../../contexts/FakeCallContext";

/* ---------------- TYPES ---------------- */
type Params = {
  profileUri?: string | string[];
  callerName?: string | string[];
};

type CallStatus = "ringing" | "ongoing" | "ended";

/* ---------------- COMPONENT ---------------- */
export default function CallScreen() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Get initial values from route params
  const rawCallerName = Array.isArray(params.callerName)
    ? params.callerName[0]
    : params.callerName;

  const rawProfileUri = Array.isArray(params.profileUri)
    ? params.profileUri[0]
    : params.profileUri;

  const {
    callState,
    activeCall,
    answerCall,
    endCall,
    playRingtone,
    stopAudio,
    formatDuration,
    toggleMute: contextToggleMute,
    toggleSpeaker: contextToggleSpeaker
  } = useFakeCall();

  // Store caller info in state - prioritize activeCall from context over route params
  const [callerName, setCallerName] = useState<string>(
    activeCall?.callerName ?? rawCallerName ?? "Unknown Caller"
  );
  const [callerAvatar, setCallerAvatar] = useState<string>(
    activeCall?.avatar ??
    (rawProfileUri
      ? decodeURIComponent(rawProfileUri)
      : "https://ui-avatars.com/api/?background=random&name=Caller")
  );

  const [status, setStatus] = useState<CallStatus>("ringing");
  const [audioReady, setAudioReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const mountedRef = useRef(true);
  const ringtoneStartedRef = useRef(false);

  /* ---------------- AUDIO INIT ---------------- */
  const initAudio = async () => {
    // Audio is now managed by FakeCallContext
    if (mountedRef.current) setAudioReady(true);
  };

  /* ---------------- LIFECYCLE ---------------- */
  useEffect(() => {
    mountedRef.current = true;
    ringtoneStartedRef.current = false;
    initAudio();

    // Track app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('[FAKE CALL] App state changed to:', nextAppState);
    });

    return () => {
      mountedRef.current = false;
      StatusBar.setHidden(false);
      console.log('[FAKE CALL] CallScreen unmounting - cleanup handled by context');
      subscription.remove();
    };
  }, []); // Only run on mount/unmount

  /* ---------------- SYNC UI WITH CONTEXT STATE ---------------- */
  useEffect(() => {
    if (callState === 'incoming' && status !== 'ringing') {
      ringtoneStartedRef.current = false; // Reset for new call
      setStatus('ringing');
      if (activeCall) {
        setCallerName(activeCall.callerName);
        setCallerAvatar(activeCall.avatar);
      }
    } else if (callState === 'active' && status !== 'ongoing') {
      ringtoneStartedRef.current = false;
      setStatus('ongoing');
      if (activeCall) {
        setCallerName(activeCall.callerName);
        setCallerAvatar(activeCall.avatar);
        setIsMuted(activeCall.isMuted);
        setIsSpeakerOn(activeCall.isSpeakerOn);
      }
    } else if (callState === 'ended' && status !== 'ended') {
      ringtoneStartedRef.current = false;
      setStatus('ended');
    } else if (callState === 'idle' && status !== 'ended') {
      ringtoneStartedRef.current = false;
      console.log('[FAKE CALL] No active call, redirecting to FakeCall screen');
      router.replace("../FakeCall");
    }
  }, [callState, activeCall]);

  useEffect(() => {
    if (!audioReady) return;

    if (status === "ringing" && callState === 'incoming' && !ringtoneStartedRef.current) {
      // Play ringtone exactly once per call lifecycle
      ringtoneStartedRef.current = true;
      console.log('[FAKE CALL] CallScreen - Starting ringtone');
      playRingtone();
    }

    if (status === "ended") {
      setTimeout(() => {
        if (mountedRef.current) {
          router.replace("../FakeCall");
        }
      }, 500);
    }
  }, [status, audioReady, callState]);

  /* ---------------- HANDLERS ---------------- */
  const handleAnswer = async () => {
    try {
      console.log('[FAKE CALL] CallScreen - Answering call');
      await answerCall(); // Context handles audio, timer, and notification
      setStatus("ongoing");
      console.log('[FAKE CALL] CallScreen - Call answered');
    } catch (error) {
      console.error('[FAKE CALL] Error in handleAnswer:', error);
    }
  };

  const handleEnd = async () => {
    console.log('[FAKE CALL] CallScreen - Ending call');
    await endCall(); // Context handles all cleanup
    setStatus("ended");
  };

  const handleToggleMute = () => {
    contextToggleMute();
    setIsMuted(!isMuted);
  };

  const handleToggleSpeaker = async () => {
    await contextToggleSpeaker();
    setIsSpeakerOn(!isSpeakerOn);
  };

  /* ---------------- UI ---------------- */
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#1a1a1a" : "#FFFFFF" },
      ]}
    >
      {Platform.OS === "android" && <StatusBar hidden />}

      <Image source={{ uri: callerAvatar }} style={styles.avatar} />

      <Text
        style={[styles.callerName, { color: isDark ? "#fff" : "#000" }]}
      >
        {callerName}
      </Text>

      <Text style={[styles.status, { color: isDark ? "#ccc" : "#666" }]}>
        {status === "ringing"
          ? "Incoming Call..."
          : status === "ongoing"
          ? formatDuration(activeCall?.callDuration || 0)
          : "Call Ended"}
      </Text>

      {status === "ringing" && (
        <View style={styles.row}>
          <TouchableOpacity style={styles.reject} onPress={handleEnd}>
            <Ionicons
              name="call"
              size={34}
              color="#fff"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.accept} onPress={handleAnswer}>
            <Ionicons name="call" size={34} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {status === "ongoing" && (
        <View style={styles.controlsContainer}>
          {/* Speaker Button */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              isSpeakerOn && styles.controlButtonActive,
            ]}
            onPress={handleToggleSpeaker}
          >
            <MaterialCommunityIcons
              name={isSpeakerOn ? "volume-high" : "volume-medium"}
              size={28}
              color={isSpeakerOn ? "#fff" : "#666"}
            />
            <Text
              style={[
                styles.controlText,
                { color: isSpeakerOn ? "#fff" : "#666" },
              ]}
            >
              Speaker
            </Text>
          </TouchableOpacity>

          {/* Mute Button */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              isMuted && styles.controlButtonActive,
            ]}
            onPress={handleToggleMute}
          >
            <MaterialCommunityIcons
              name={isMuted ? "microphone-off" : "microphone"}
              size={28}
              color={isMuted ? "#fff" : "#666"}
            />
            <Text
              style={[
                styles.controlText,
                { color: isMuted ? "#fff" : "#666" },
              ]}
            >
              Mute
            </Text>
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity style={styles.reject} onPress={handleEnd}>
            <Ionicons
              name="call"
              size={34}
              color="#fff"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
            <Text style={styles.endText}>End Call</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "#4caf50",
  },
  callerName: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 6,
  },
  status: {
    fontSize: 16,
    marginBottom: 60,
  },
  row: {
    flexDirection: "row",
    gap: 40,
  },
  accept: {
    backgroundColor: "#4caf50",
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  reject: {
    backgroundColor: "#f44336",
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  endText: {
    color: "#fff",
    marginTop: 6,
    fontSize: 13,
  },
  controlsContainer: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
  },
  controlButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#666",
  },
  controlButtonActive: {
    backgroundColor: "#4caf50",
    borderColor: "#4caf50",
  },
  controlText: {
    fontSize: 12,
    marginTop: 4,
  },
});