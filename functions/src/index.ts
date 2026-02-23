import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

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
export const deleteUserAccount = functions.https.onCall(async (data, context) => {
    try {
        // Check authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        // Check if caller is an admin (optional - add additional validation if needed)
        // You can verify the caller is an admin by checking custom claims or Firestore roles
        
        const { userId } = data;

        // Validate input
        if (!userId || typeof userId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Valid userId is required');
        }

        console.log(`[deleteUserAccount] Admin ${context.auth.uid} requesting deletion of user ${userId}`);

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
export const sendEmergencySms = functions.https.onCall(async (data, context) => {
    try {
        // Check authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { phones, message, latitude, longitude, userName } = data;

        // Validate inputs
        if (!phones || !Array.isArray(phones) || phones.length === 0) {
            throw new functions.https.HttpsError('invalid-argument', 'Valid phone numbers array required');
        }

        if (!message || typeof message !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Valid message string required');
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
        const userId = context.auth.uid;
        const db = admin.firestore();
        await db.collection('emergency_logs').add({
            userId,
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
