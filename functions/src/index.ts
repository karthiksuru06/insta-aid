import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

/**
 * Verify that the caller is an admin.
 *
 * RBAC is enforced via Firebase Authentication custom claims (`admin === true`),
 * which are set through the backend `/api/admin/set-claim` endpoint. As a
 * defence-in-depth fallback we also accept membership of the `admins`
 * collection (keyed by uid). No email addresses are hard-coded.
 *
 * Throws an HttpsError if the caller is not authenticated or not an admin.
 */
async function assertCallerIsAdmin(context: functions.https.CallableContext): Promise<void> {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    if (context.auth.token?.admin === true) {
        return;
    }

    const adminDoc = await admin.firestore().collection('admins').doc(context.auth.uid).get();
    if (adminDoc.exists && adminDoc.data()?.role === 'admin') {
        return;
    }

    throw new functions.https.HttpsError('permission-denied', 'Caller does not have admin privileges');
}

/** Basic E.164-ish phone validation: optional leading +, 7-15 digits. */
function isValidPhone(phone: unknown): phone is string {
    return typeof phone === 'string' && /^\+?[0-9]{7,15}$/.test(phone.replace(/[\s-]/g, ''));
}

// Per-user emergency SMS rate limit (defence against SMS-spam / billing abuse).
const SMS_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const SMS_RATE_LIMIT_MAX = 3;                    // max sends per window per user
const SMS_MAX_RECIPIENTS = 10;                   // max phones per request

/**
 * Cloud Function to delete a user from both Firestore and Firebase Authentication
 * 
 * This function should only be called by admins to delete users completely.
 * It removes the user from:
 * 1. Firestore 'users' collection
 * 2. Firebase Authentication
 * 
 * Request payload:
 * {
 *   userId: string  // UID of the user to delete
 * }
 */
export const deleteUserAccount = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    try {
        // Only admins may delete arbitrary user accounts.
        await assertCallerIsAdmin(context);

        const { userId } = data;

        // Validate input
        if (!userId || typeof userId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Valid userId is required');
        }

        console.log(`[deleteUserAccount] Admin ${context.auth?.uid} requesting deletion of user ${userId}`);

        // Delete from Firestore
        try {
            await admin.firestore().collection('users').doc(userId).delete();
            console.log(`[deleteUserAccount] ✅ Deleted user ${userId} from Firestore`);
        } catch (firestoreError) {
            console.error(`[deleteUserAccount] ❌ Error deleting from Firestore:`, firestoreError);
            throw new functions.https.HttpsError('internal', 'Failed to delete user from Firestore');
        }

        // Delete from Firebase Authentication
        try {
            await admin.auth().deleteUser(userId);
            console.log(`[deleteUserAccount] ✅ Deleted user ${userId} from Firebase Auth`);
        } catch (authError: any) {
            // Log the error but don't fail if auth deletion fails
            // This can happen if the user doesn't exist in Auth
            console.warn(`[deleteUserAccount] ⚠️ Error deleting from Firebase Auth:`, authError.message);
            if (authError.code !== 'auth/user-not-found') {
                throw new functions.https.HttpsError('internal', 'Failed to delete user from Firebase Auth');
            }
        }

        console.log(`[deleteUserAccount] ✅ User ${userId} completely deleted`);

        return {
            success: true,
            message: `User ${userId} has been successfully deleted`,
            userId
        };
    } catch (error: any) {
        console.error('[deleteUserAccount] Error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Failed to delete user account'
        );
    }
});

/**
 * Cloud Function to send emergency SMS alerts to emergency contacts
 * 
 * This function sends SMS messages via a third-party SMS provider (Twilio or similar)
 * when a user triggers the emergency alert by shaking their phone 3 times.
 * 
 * Required environment variables:
 * - SMS_PROVIDER (twilio, fast2sms, etc.)
 * - SMS_API_KEY or TWILIO credentials
 * 
 * Request payload:
 * {
 *   phones: string[], // Array of phone numbers
 *   message: string,  // Message to send
 *   latitude: number,
 *   longitude: number,
 *   userName: string
 * }
 */
export const sendEmergencySms = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    try {
        // Check authentication. The sender is the person in distress, so any
        // authenticated user is a legitimate caller — but we still rate-limit
        // and validate to prevent SMS-spam / billing-abuse from compromised or
        // scripted clients.
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const callerUid = context.auth.uid;
        const db = admin.firestore();

        const { phones, message, latitude, longitude, userName } = data;

        // Validate inputs
        if (!phones || !Array.isArray(phones) || phones.length === 0) {
            throw new functions.https.HttpsError('invalid-argument', 'Valid phone numbers array required');
        }

        if (phones.length > SMS_MAX_RECIPIENTS) {
            throw new functions.https.HttpsError('invalid-argument', `At most ${SMS_MAX_RECIPIENTS} recipients allowed`);
        }

        const invalidPhones = phones.filter((p) => !isValidPhone(p));
        if (invalidPhones.length > 0) {
            throw new functions.https.HttpsError('invalid-argument', 'One or more phone numbers are invalid');
        }

        if (!message || typeof message !== 'string' || message.length > 1000) {
            throw new functions.https.HttpsError('invalid-argument', 'Valid message string required (max 1000 chars)');
        }

        // Per-user rate limiting: count this user's sends in the recent window.
        const windowStart = admin.firestore.Timestamp.fromMillis(Date.now() - SMS_RATE_LIMIT_WINDOW_MS);
        const recentSends = await db.collection('emergency_logs')
            .where('userId', '==', callerUid)
            .where('timestamp', '>', windowStart)
            .count()
            .get();
        if (recentSends.data().count >= SMS_RATE_LIMIT_MAX) {
            throw new functions.https.HttpsError(
                'resource-exhausted',
                'Emergency SMS rate limit reached. Please wait a few minutes before trying again.'
            );
        }

        console.log(`[sendEmergencySms] Sending emergency alert from ${userName || 'Unknown'}`);
        console.log(`[sendEmergencySms] Target phones: ${phones.join(', ')}`);
        console.log(`[sendEmergencySms] Location: ${latitude}, ${longitude}`);

        const results: any = {
            success: [],
            failed: []
        };

        // Send SMS to each phone number
        for (const phone of phones) {
            try {
                await sendSmsViaProvider(phone, message);
                results.success.push(phone);
                console.log(`[sendEmergencySms] ✅ SMS sent to ${phone}`);
            } catch (error: any) {
                results.failed.push({
                    phone,
                    error: error.message || 'Unknown error'
                });
                console.error(`[sendEmergencySms] ❌ Failed to send SMS to ${phone}:`, error);
            }
        }

        // Log the emergency alert
        await db.collection('emergency_logs').add({
            userId: callerUid,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            location: {
                latitude,
                longitude
            },
            contactsNotified: results.success,
            failedContacts: results.failed,
            message
        });

        console.log(`[sendEmergencySms] Emergency logged. Success: ${results.success.length}, Failed: ${results.failed.length}`);

        return {
            success: results.success.length > 0,
            sentCount: results.success.length,
            failedCount: results.failed.length,
            results
        };
    } catch (error: any) {
        console.error('[sendEmergencySms] Error:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Failed to send emergency SMS'
        );
    }
});

/**
 * Send SMS via provider (Twilio, Fast2SMS, etc.)
 * 
 * UPDATE THIS FUNCTION with your preferred SMS provider credentials
 */
async function sendSmsViaProvider(phone: string, message: string): Promise<void> {
    const provider = process.env.SMS_PROVIDER || 'twilio';

    if (provider === 'twilio') {
        return await sendViaTwilio(phone, message);
    } else if (provider === 'fast2sms') {
        return await sendViaFast2SMS(phone, message);
    } else {
        // Fallback: Log the SMS (development mode)
        console.log(`[SMS] To: ${phone}\nMessage: ${message}`);
        return;
    }
}

/**
 * Send SMS via Twilio
 * 
 * Set up environment variables in Firebase:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 */
async function sendViaTwilio(phone: string, message: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
        console.warn('[Twilio] Missing credentials. Using fallback logging.');
        console.log(`[SMS-FALLBACK] To: ${phone}\nMessage: ${message}`);
        return;
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    try {
        const response = await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            new URLSearchParams({
                Body: message,
                From: fromNumber,
                To: phone
            }),
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log(`[Twilio] Message sent to ${phone}:`, response.data.sid);
    } catch (error: any) {
        throw new Error(`Twilio error: ${error.response?.data?.message || error.message}`);
    }
}

/**
 * Send SMS via Fast2SMS (India-based provider)
 * 
 * Set up environment variable in Firebase:
 * - FAST2SMS_API_KEY
 */
async function sendViaFast2SMS(phone: string, message: string): Promise<void> {
    const apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
        console.warn('[Fast2SMS] Missing API key. Using fallback logging.');
        console.log(`[SMS-FALLBACK] To: ${phone}\nMessage: ${message}`);
        return;
    }

    try {
        const response = await axios.get('https://www.fast2sms.com/dev/query', {
            params: {
                authorization: apiKey,
                route: 'q',
                message: message,
                numbers: phone
            }
        });

        console.log(`[Fast2SMS] Message sent to ${phone}:`, response.data);
    } catch (error: any) {
        throw new Error(`Fast2SMS error: ${error.response?.data?.message || error.message}`);
    }
}
