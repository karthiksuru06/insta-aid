// scripts/setAdmin.mjs
// One-shot bootstrap: grant a user the `admin` (or superadmin) custom claim.
// This removes the need to hand-edit the Firestore `admins` collection.
//
// Usage:
//   FIREBASE_SERVICE_ACCOUNT='<service-account-json>' \
//     node scripts/setAdmin.mjs <uid-or-email> [role]
//
//   role defaults to "superadmin" (so the first admin can grant others).
//   Requires a service account with Auth Admin + Firestore privileges.
//
// Example:
//   node scripts/setAdmin.mjs admin@example.com superadmin

import admin from "firebase-admin";
import { isValidRole, roleGrantsAdminClaim } from "../lib/security.mjs";

const [, , identifier, roleArg = "superadmin"] = process.argv;

if (!identifier) {
  console.error("Usage: node scripts/setAdmin.mjs <uid-or-email> [role]");
  process.exit(1);
}
if (!isValidRole(roleArg)) {
  console.error(`Invalid role "${roleArg}". Valid: user, moderator, admin, superadmin`);
  process.exit(1);
}

const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!svc) {
  console.error("FIREBASE_SERVICE_ACCOUNT env var is required (stringified service-account JSON).");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(svc)) });

async function main() {
  // Resolve the UID (accept either a raw uid or an email).
  let uid = identifier;
  if (identifier.includes("@")) {
    const user = await admin.auth().getUserByEmail(identifier);
    uid = user.uid;
  }

  await admin.auth().setCustomUserClaims(uid, {
    admin: roleGrantsAdminClaim(roleArg),
    role: roleArg,
  });

  // Mirror into the admins collection so the Firestore rules' fallback
  // (admins/{uid}.role == 'admin') also recognises this user.
  const adminDocRef = admin.firestore().collection("admins").doc(uid);
  if (roleGrantsAdminClaim(roleArg)) {
    await adminDocRef.set(
      { role: "admin", grantedRole: roleArg, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  } else {
    // Demotion: remove any existing admin membership.
    await adminDocRef.delete().catch(() => {});
  }

  console.log(`✅ Set role="${roleArg}" (admin claim=${roleGrantsAdminClaim(roleArg)}) for uid ${uid}.`);
  console.log("The user must sign out and back in for the new claim to take effect.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed to set admin:", err.message);
  process.exit(1);
});
