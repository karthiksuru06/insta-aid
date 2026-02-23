import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface AdminAnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdminAnnouncementModal({
  visible,
  onClose,
  onSuccess,
}: AdminAnnouncementModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendAnnouncement = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an announcement title');
      return;
    }

    if (!body.trim()) {
      Alert.alert('Error', 'Please enter announcement content');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        body: body.trim(),
        createdAt: new Date().toISOString(),
        read: false,
        timestamp: serverTimestamp(),
      });

      Alert.alert('Success', 'Announcement sent to all users');
      setTitle('');
      setBody('');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.warn('Error sending announcement:', error);
      Alert.alert('Error', 'Failed to send announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Send Announcement</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Announcement Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter announcement title"
                placeholderTextColor="#999"
                value={title}
                onChangeText={setTitle}
                editable={!loading}
                maxLength={100}
              />
              <Text style={styles.counter}>{title.length}/100</Text>
            </View>

            {/* Body Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Announcement Content *</Text>
              <TextInput
                style={[styles.input, styles.bodyInput]}
                placeholder="Enter announcement content"
                placeholderTextColor="#999"
                value={body}
                onChangeText={setBody}
                editable={!loading}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.counter}>{body.length}/500</Text>
            </View>

            {/* Preview */}
            {(title || body) && (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>Preview</Text>
                <View style={styles.previewBox}>
                  {title && <Text style={styles.previewItemTitle}>{title}</Text>}
                  {body && <Text style={styles.previewItemBody}>{body}</Text>}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.sendButton,
                loading && { opacity: 0.6 },
              ]}
              onPress={handleSendAnnouncement}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Announcement</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#f9f9f9',
  },
  bodyInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  counter: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    textAlign: 'right',
  },
  previewSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  previewBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5757',
  },
  previewItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  previewItemBody: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#FF5757',
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
