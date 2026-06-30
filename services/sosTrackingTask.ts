// services/sosTrackingTask.ts
//
// Continuous SOS location tracking (slice 7). While an SOS is active we stream
// enriched location (accuracy/speed/heading/battery/timestamp) into the active
// trackingSessions/{token} doc, but only when the device has actually moved, to
// avoid burning Firestore writes and battery.
//
// IMPORTANT: this module's `TaskManager.defineTask` must run at app startup so
// the OS can invoke the task — import it once in app/_layout.tsx.
//
// Known limitation to validate on-device: if the app is fully killed, the
// headless background task may not have an authenticated Firebase user, in which
// case the owner-only update rule rejects writes. Foreground + app-backgrounded
// tracking works. The robust killed-app path (writing via the authenticated
// backend) is a follow-up.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Battery from "expo-battery";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { locationChangedEnough, relayLocationUpdate, updateTrackingLocation } from "./trackingService";

export const SOS_LOCATION_TASK = "sos-location-tracking";
const ACTIVE_TOKEN_KEY = "activeTrackingToken";
const ACTIVE_SECRET_KEY = "activeTrackingSecret";
const LAST_COORD_KEY = "lastTrackedCoord";

TaskManager.defineTask(SOS_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn("[SOS-TRACK] task error", error.message);
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] } | null)?.locations;
  if (!locations || locations.length === 0) return;

  const token = await AsyncStorage.getItem(ACTIVE_TOKEN_KEY);
  if (!token) {
    // No active session — make sure we're not still running.
    try {
      if (await Location.hasStartedLocationUpdatesAsync(SOS_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(SOS_LOCATION_TASK);
      }
    } catch {}
    return;
  }

  const latest = locations[locations.length - 1];
  const coords = latest.coords;

  // Change detection — skip writes when we've barely moved.
  const lastRaw = await AsyncStorage.getItem(LAST_COORD_KEY);
  const last = lastRaw ? (JSON.parse(lastRaw) as { latitude: number; longitude: number }) : null;
  if (!locationChangedEnough(last, coords)) return;

  let battery: number | null = null;
  try {
    battery = await Battery.getBatteryLevelAsync();
  } catch {}

  const payload = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy ?? null,
    speed: coords.speed ?? null,
    heading: coords.heading ?? null,
    battery,
  };

  try {
    // Prefer the backend relay — it works even when the app is fully terminated
    // and Firebase auth is unavailable. Fall back to a direct Firestore write
    // (succeeds while the app/auth is alive) only if no relay secret or it fails.
    const secret = await AsyncStorage.getItem(ACTIVE_SECRET_KEY);
    let ok = false;
    if (secret) {
      ok = await relayLocationUpdate(token, secret, payload, latest.timestamp);
    }
    if (!ok) {
      await updateTrackingLocation(token, payload, latest.timestamp);
    }
    await AsyncStorage.setItem(
      LAST_COORD_KEY,
      JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude })
    );
  } catch (e) {
    console.warn("[SOS-TRACK] failed to write location", e);
  }
});

/** Begin continuous tracking for an active session token. */
export async function startSosTracking(token: string, secret?: string | null): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TOKEN_KEY, token);
  if (secret) {
    await AsyncStorage.setItem(ACTIVE_SECRET_KEY, secret);
  } else {
    await AsyncStorage.removeItem(ACTIVE_SECRET_KEY);
  }
  await AsyncStorage.removeItem(LAST_COORD_KEY);

  // Background permission is optional — without it we still get foreground
  // updates while the app is open. Never block the SOS on this.
  try {
    await Location.requestBackgroundPermissionsAsync();
  } catch {}

  try {
    const already = await Location.hasStartedLocationUpdatesAsync(SOS_LOCATION_TASK);
    if (already) return;
    await Location.startLocationUpdatesAsync(SOS_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
      distanceInterval: 15,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "InstaAid SOS active",
        notificationBody: "Sharing your live location with your emergency contacts.",
        notificationColor: "#ED4B4B",
      },
    });
  } catch (e) {
    console.warn("[SOS-TRACK] could not start background updates", e);
  }
}

/** Store/refresh the relay write-secret after async registration (so it doesn't
 *  block the SOS SMS). Until set, background writes fall back to a direct write. */
export async function setActiveRelaySecret(secret: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_SECRET_KEY, secret);
}

/** Stop continuous tracking. Returns the token that was active (if any). */
export async function stopSosTracking(): Promise<string | null> {
  const token = await AsyncStorage.getItem(ACTIVE_TOKEN_KEY);
  try {
    if (await Location.hasStartedLocationUpdatesAsync(SOS_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(SOS_LOCATION_TASK);
    }
  } catch {}
  await AsyncStorage.removeItem(ACTIVE_TOKEN_KEY);
  await AsyncStorage.removeItem(ACTIVE_SECRET_KEY);
  await AsyncStorage.removeItem(LAST_COORD_KEY);
  return token;
}
