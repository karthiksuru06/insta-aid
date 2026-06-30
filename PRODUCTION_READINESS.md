# InstaAID — Production Readiness Notes

This document records the hardening changes applied to the codebase and the
**manual steps you must still perform** (things that cannot be done from source
alone). It also corrects a few claims from the earlier review that turned out to
be inaccurate against the current code.

---

## ✅ Fixed in code

### Cloud Functions (`functions/src/index.ts`)
- **`deleteUserAccount` now requires admin.** Added `assertCallerIsAdmin()` which
  checks the `admin` custom claim (with an `admins/{uid}` collection fallback).
  Previously *any* authenticated user could delete *any* account.
- **`sendEmergencySms` now rate-limited & validated.** Per-user limit of 3 sends
  / 5 minutes (counted from `emergency_logs`), max 10 recipients, E.164-style
  phone validation, and a 1000-char message cap. Prevents SMS-spam / billing abuse.

### Backend (`server.mjs`, formerly `server.js`)
- **Renamed `server.js` → `server.mjs`.** The file uses ESM `import` syntax but the
  package is CommonJS (no `"type": "module"`), so `node server.js` would have
  failed to boot on Render. `.mjs` forces ESM without breaking Expo's CommonJS
  config files. `render.yaml` (both copies), `README.md`, and `CONTRIBUTING.md`
  updated accordingly.
- **CORS no longer defaults to `*`.** Origins come from a comma-separated
  `CORS_ORIGIN` allowlist. In production, an unset value rejects all cross-origin
  browser requests (fail-safe) instead of allowing everything.
- **Removed hard-coded admin email.** `requireAdmin` now uses the `admin` custom
  claim, with an optional `ADMIN_EMAILS` env allowlist for first-time bootstrap.
- **Privilege-escalation guard on `/api/admin/set-claim`.** Only a `superadmin`
  may grant `admin`/`superadmin`; moderators no longer receive the broad `admin`
  claim; users cannot change their own role.
- **Bounded the admin user-search.** Page size clamped to 1–100; search term length
  validated (≤100 chars).

### Client / config
- **`firebaseConfig.ts`** no longer hard-codes the API key — it reads
  `EXPO_PUBLIC_FIREBASE_*` only and throws if missing. (See key-rotation note below.)
- **Removed hard-coded admin email** from `src/Contexts/AuthContexts.tsx` and
  `app/Login.tsx` — admin status is role/claim driven only.
- **`firestore.rules` / `storage.rules`**: `isAdmin()` no longer references a
  hard-coded email; driven by the `admin` claim (+ `admins/{uid}` for Firestore).
- **Root error boundary** (`components/RootErrorBoundary.tsx`) wraps the whole
  provider/navigation tree in `app/_layout.tsx`, replacing white-screen crashes
  with a recoverable screen.
- **Sentry crash reporting wired** via `services/sentry.ts`: initialized at
  startup in `_layout.tsx`, and `RootErrorBoundary.componentDidCatch` forwards
  unhandled errors. It's a **no-op until a DSN is configured**, so nothing breaks
  in dev. The Expo config plugin (`@sentry/react-native/expo`) is registered for
  native setup + source-map upload. **You must run
  `npx expo install @sentry/react-native`** and set `EXPO_PUBLIC_SENTRY_DSN`.
- **`firebase.json`** now deploys `storage.rules` (previously never deployed) and a
  new `firestore.indexes.json` (composite index for the SMS rate-limit query).
- A gitignored **`.env`** was created with the Firebase config values so local and
  EAS builds keep working without a committed fallback.

---

### Automation, tests & extra hardening (latest round)
- **Backend security headers** (no new dependency) via `lib/security.mjs`:
  HSTS, `nosniff`, `X-Frame-Options: DENY`, restrictive CSP, `x-powered-by` off.
- **Security logic extracted to `lib/security.mjs`** (CORS allowlist, page-size
  clamp, role/escalation rules, status/search validation) and wired into
  `server.mjs`, which now also **exports `app`** and only listens when run directly.
- **12 passing unit tests** (`tests/security.test.mjs`, run with `npm test` —
  zero-install `node:test`).
- **CI upgraded** (`.github/workflows/ci.yml`): lint + typecheck + tests + functions
  build + frontend build + Expo config validation.
- **Deploy pipeline** (`.github/workflows/deploy.yml`): secret-gated Firebase
  (rules/indexes/functions) + EAS build + Render hook — auto-runs on push to main.
- **`npm run set-admin <uid|email> [role]`** (`scripts/setAdmin.mjs`) bootstraps an
  admin via custom claim — replaces hand-editing Firestore.
- New npm scripts: `test`, `typecheck`, `start:server`, `set-admin`.

See **`ROADMAP_TO_5.md`** for the scored checklist to reach 5/5.

## ⚠️ Manual steps you MUST do (cannot be done from code)

1. **Restrict / rotate the exposed keys** in their consoles:
   - The Firebase Web API key was previously committed. Firebase web keys are
     *project identifiers, not secrets*, but you should still lock them down:
     Google Cloud Console → Credentials → restrict the key by Android app
     signature / HTTP referrer, and enable **Firebase App Check**.
   - Rotate the **Google Maps API key** and put the real value in `.env`
     (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is currently a placeholder).
   - If any **service-account JSON** or **Vercel/OIDC token** was ever shared,
     revoke and reissue it. (Note: `frontend/.env.local` is **not** committed to
     git — Next.js ignores `.env*.local` — but rotate the token if it leaked.)
2. **Set environment variables in each platform's dashboard:**
   - Render: `CORS_ORIGIN` (your real frontend origin), `FIREBASE_SERVICE_ACCOUNT`,
     optionally `ADMIN_EMAILS` for bootstrap.
   - Vercel: the frontend's Firebase/public vars.
   - EAS: the `EXPO_PUBLIC_*` vars (or rely on the uploaded `.env`).
3. **Deploy the updated rules / indexes / functions:**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   cd functions && npm install && npm run build && firebase deploy --only functions
   ```
4. **Bootstrap the first admin** (no more hard-coded email): add an
   `admins/<your-uid>` doc with `{ role: "admin" }` in the Firebase console, or set
   `ADMIN_EMAILS` on Render once and call `/api/admin/set-claim`.
5. **Install Sentry & set its DSN:** `npx expo install @sentry/react-native`, then
   set `EXPO_PUBLIC_SENTRY_DSN` (and optionally `SENTRY_ORG`/`SENTRY_PROJECT`/
   `SENTRY_AUTH_TOKEN` for source maps). Until installed, the bundler will report
   `Cannot find module '@sentry/react-native'`.

---

## 🟡 Corrections to the earlier review

- `server.js` already had rate limiting, token verification, and an admin gate —
  it was **not** unprotected. (It did have the CORS/role/email issues fixed above.)
- `dist/` and `.env*.local` were **already gitignored**; `dist/` is not tracked.
- `Settings.tsx:22` import is **not** a bug — `utils/firebaseConfig.ts` is a valid
  re-export shim of the root config.
- The EAS build failed on `Cannot find module 'babel-preset-expo'` (now present in
  `package.json` deps) plus an `app.json` asset-validation warning — re-run the
  build to confirm; there is no `app.json` (config is `app.config.js`).
- Backend deps (`express`, `firebase-admin`, etc.) in the app `package.json` are
  **shared with the Render backend** (same `rootDir`). Metro only bundles imported
  modules, so they do **not** bloat the APK. Splitting the backend into its own
  package is a clean-up, not a blocker.

---

## 🔭 Recommended next (not done here — larger efforts)

- Automated tests (unit + integration for auth, SOS, rate limits) and CI gates.
- Consolidate the duplicated shake-detection / SMS-send implementations.
- Add `expo-doctor` and a typecheck to CI; clear the 9 remaining pre-existing
  TypeScript errors (see `ts_errors.txt`).
