import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  seconds?: number;
  /** Called exactly once when the countdown reaches zero (SOS should fire). */
  onComplete: () => void;
  /** Called if the user cancels before the countdown completes. */
  onCancel: () => void;
};

/**
 * Full-screen 3-2-1 countdown shown BEFORE an SOS actually fires, giving the
 * user a short window to cancel an accidental (e.g. shake) trigger. Fires
 * onComplete once at zero; onCancel if dismissed first.
 */
export default function SOSCountdownModal({ visible, seconds = 3, onComplete, onCancel }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  // Keep the latest onComplete without restarting the interval each render.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!visible) return;
    setRemaining(seconds);
    let current = seconds;
    const id = setInterval(() => {
      current -= 1;
      setRemaining(current);
      if (current <= 0) {
        clearInterval(id);
        onCompleteRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [visible, seconds]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Sending SOS in</Text>
          <Text style={styles.count}>{Math.max(remaining, 0)}</Text>
          <Text style={styles.subtitle}>
            An emergency alert with your live location will be sent to your contacts.
          </Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1b1b1b',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  count: { color: '#ED4B4B', fontSize: 72, fontWeight: '800', lineHeight: 80 },
  subtitle: { color: '#ccc', fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  cancelBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  cancelText: { color: '#111', fontSize: 16, fontWeight: '700' },
});
