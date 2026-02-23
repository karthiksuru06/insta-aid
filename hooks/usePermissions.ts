/**
 * usePermissions Hook
 * 
 * This hook manages all app permissions from AsyncStorage.
 * Features check these toggles BEFORE performing sensitive operations.
 * 
 * Permissions tracked:
 * - locationEnabled: Location tracking for alerts
 * - smsEnabled: SMS for emergency contacts
 * - contactsEnabled: Contact access
 * - cameraEnabled: Photo capture
 * - mediaEnabled: Gallery save
 * - motionEnabled: Shake/motion detection
 */

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PermissionState {
  locationEnabled: boolean;
  smsEnabled: boolean;
  contactsEnabled: boolean;
  cameraEnabled: boolean;
  mediaEnabled: boolean;
  motionEnabled: boolean;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionState>({
    locationEnabled: false,
    smsEnabled: false,
    contactsEnabled: false,
    cameraEnabled: false,
    mediaEnabled: false,
    motionEnabled: false,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load all permissions from AsyncStorage
  const loadPermissions = async () => {
    try {
      const stored = await AsyncStorage.multiGet([
        'locationEnabled',
        'smsEnabled',
        'contactsEnabled',
        'cameraEnabled',
        'mediaEnabled',
        'motionEnabled',
      ]);

      setPermissions({
        locationEnabled: stored[0][1] === 'true',
        smsEnabled: stored[1][1] === 'true',
        contactsEnabled: stored[2][1] === 'true',
        cameraEnabled: stored[3][1] === 'true',
        mediaEnabled: stored[4][1] === 'true',
        motionEnabled: stored[5][1] === 'true',
      });
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load permissions on mount
  useEffect(() => {
    loadPermissions();
  }, []);

  // Check a specific permission
  const hasPermission = (permission: keyof PermissionState): boolean => {
    return permissions[permission];
  };

  // Refresh permissions (useful when returning from settings)
  const refreshPermissions = async () => {
    await loadPermissions();
  };

  return {
    permissions,
    isLoading,
    hasPermission,
    refreshPermissions,
  };
};
