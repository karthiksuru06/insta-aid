// services/sentry.ts
// Thin, safe wrapper around @sentry/react-native.
//
// Setup (one-time):
//   1. npx expo install @sentry/react-native
//   2. Set EXPO_PUBLIC_SENTRY_DSN in your .env (and in EAS / Vercel env).
//   3. (Optional, for source maps) set SENTRY_ORG / SENTRY_PROJECT /
//      SENTRY_AUTH_TOKEN at build time — see app.config.js plugin.
//
// Everything below is a no-op until a DSN is configured, so the app behaves
// normally in development and when error reporting is intentionally disabled.

import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const environment =
  process.env.EXPO_PUBLIC_ENV || (__DEV__ ? "development" : "production");

let initialized = false;

/** Initialize Sentry once, at app startup. Safe to call when no DSN is set. */
export function initSentry(): void {
  if (initialized) return;
  if (!dsn) {
    if (__DEV__) {
      console.warn(
        "[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash reporting is disabled."
      );
    }
    return;
  }

  Sentry.init({
    dsn,
    environment,
    debug: __DEV__,
    // Sample performance traces lightly in production; fully in dev.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Don't spam Sentry from local development builds.
    enabled: !__DEV__,
  });
  initialized = true;
}

/** Report a caught error. No-op when Sentry is not configured. */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/** Attach the signed-in user to subsequent events (call after login/logout). */
export function setSentryUser(
  user: { id: string; email?: string | null } | null
): void {
  if (!initialized) return;
  Sentry.setUser(user ? { id: user.id, email: user.email ?? undefined } : null);
}

export { Sentry };
