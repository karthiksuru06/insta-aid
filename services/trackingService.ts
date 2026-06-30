// services/trackingService.ts
//
// Secure live-tracking sessions. Each SOS creates a `trackingSessions/{token}`
// document whose ID is a cryptographically-random token. That token (never a
// Firestore/alert ID) is what gets shared in the SOS link, so anyone with the
// link can watch the location but the collection can't be enumerated. See
// firestore.rules → match /trackingSessions/{token}.

import * as Random from "expo-random";
import {
  Timestamp,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export type TrackingLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null; // m/s
  heading: number | null; // degrees
  battery: number | null; // 0..1
};

const TRACKING_COLLECTION = "trackingSessions";
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL || "https://instaaid-backend-47wd.onrender.com/api"
).replace(/\/+$/, "");

/** Cryptographically-secure, URL-safe token (48 hex chars ≈ 192 bits). */
export async function generateTrackingToken(): Promise<string> {
  const bytes = await Random.getRandomBytesAsync(24);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Create a new ACTIVE tracking session and return its token.
 *  Pass a pre-generated `token` to decouple the (local, instant) token from the
 *  Firestore write, so an emergency SMS can carry the live link without waiting
 *  on the network round-trip. */
export async function createTrackingSession(params: {
  userId: string;
  displayName?: string | null;
  alertId?: string | null;
  ttlMs?: number;
  token?: string;
}): Promise<string> {
  const token = params.token ?? (await generateTrackingToken());
  const ttl = params.ttlMs ?? DEFAULT_TTL_MS;
  await setDoc(doc(db, TRACKING_COLLECTION, token), {
    token,
    userId: params.userId,
    displayName: params.displayName ?? null,
    alertId: params.alertId ?? null,
    status: "ACTIVE",
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + ttl),
    location: null,
  });
  return token;
}

/** Push the latest location onto an active session. */
export async function updateTrackingLocation(
  token: string,
  loc: TrackingLocation,
  deviceTimeMs?: number
): Promise<void> {
  await updateDoc(doc(db, TRACKING_COLLECTION, token), {
    location: {
      ...loc,
      timestamp: deviceTimeMs ? Timestamp.fromMillis(deviceTimeMs) : Timestamp.now(),
    },
  });
}

/** End sharing: mark ENDED and clear the live location so it can't be read after. */
export async function endTrackingSession(token: string): Promise<void> {
  await updateDoc(doc(db, TRACKING_COLLECTION, token), {
    status: "ENDED",
    endedAt: serverTimestamp(),
    location: null,
  });
}

/** Public tracking URL for a token (frontend /track/<token> route). */
export function trackingUrl(token: string): string {
  const base =
    process.env.EXPO_PUBLIC_TRACKING_BASE_URL || "https://instaaid-frontend.vercel.app";
  return `${base.replace(/\/+$/, "")}/track/${token}`;
}

// ---------------------------------------------------------------------------
// Backend relay (background-safe). The headless background task can't get a
// Firebase ID token, so it authenticates location writes with a per-session
// secret obtained here (while still authenticated) and the backend writes via
// the Admin SDK. See server.mjs → /api/tracking/*.
// ---------------------------------------------------------------------------

/** Register a backend write-secret for this session. Returns the secret or null.
 *  Retries with backoff because this is fired at SOS time when the free-tier
 *  backend is most likely cold — a single attempt that times out would silently
 *  forfeit the killed-app relay path for the whole session. */
export async function registerRelaySecret(
  token: string,
  attempts = 3
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  let idToken: string;
  try {
    idToken = await user.getIdToken();
  } catch (e) {
    console.warn("[TRACK] could not get id token for relay registration", e);
    return null;
  }
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${API_BASE}/tracking/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.secret === "string") return data.secret;
      }
    } catch (e) {
      console.warn(`[TRACK] relay secret registration attempt ${i + 1} failed`, e);
    }
    // Backoff before retrying (skip the wait after the final attempt). Gives a
    // cold Render dyno time to wake (~first request triggers the spin-up).
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  return null;
}

/** Relay a location update via the backend (works even when the app is killed). */
export async function relayLocationUpdate(
  token: string,
  secret: string,
  loc: TrackingLocation,
  deviceTimeMs?: number
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/tracking/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, secret, ...loc, deviceTimeMs }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** End a session via the backend relay secret. */
export async function relayEnd(token: string, secret: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/tracking/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, secret }),
    });
  } catch {}
}

/** Whether the location moved far enough to justify a Firestore write. */
export function locationChangedEnough(
  prev: { latitude: number; longitude: number } | null,
  next: { latitude: number; longitude: number },
  minMeters = 15
): boolean {
  if (!prev) return true;
  return haversineMeters(prev.latitude, prev.longitude, next.latitude, next.longitude) >= minMeters;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
