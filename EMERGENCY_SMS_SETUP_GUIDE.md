# Emergency SMS Notification Setup & Debugging Guide

## Overview
The emergency alert system now uses:
1. **Server-side SMS sending** via Cloud Functions (primary)
2. **Device SMS composer** via `expo-sms` (fallback)
3. **Retry mechanism** - attempts cloud function twice before falling back
4. **Detailed feedback** - shows user exactly how many contacts received SMS

---

## How It Works

### When User Clicks "I AM IN DANGER"
```
1. Local notification sent to user's device
   ├─ Shows 🚨 DANGER ALERT
   └─ User sees local notification

2. Cloud function called (Attempt 1 & 2 with retry)
   ├─ Fetches user's emergency contacts
   ├─ Sends SMS via provider (Twilio/Fast2SMS)
   └─ Returns: { sentCount, failedCount, details }

3. If Cloud Function fails:
   ├─ Falls back to expo-sms (device SMS composer)
   ├─ Opens SMS app with emergency contacts
   └─ User can send manually or let it auto-send

4. Notification documents created in Firestore
   ├─ Records which contacts were notified
   └─ Tracks SMS status (sent/failed)

5. User location saved:
   ├─ User status marked as "DANGER"
   ├─ Location shared with nearby users
   └─ Emergency contacts notified
```

---

## Prerequisites: SMS Provider Setup

### Option 1: Using Twilio (Recommended)
1. Create free Twilio account: https://www.twilio.com
2. Get phone number (trial account or paid)
3. Set environment variables in Firebase Functions:

```bash
firebase functions:config:set \
  sms.provider="twilio" \
  sms.twilio_account_sid="your_account_sid" \
  sms.twilio_auth_token="your_auth_token" \
  sms.twilio_phone_number="+1234567890"
```

4. Deploy functions:
```bash
cd functions
npm install
firebase deploy --only functions
```

### Option 2: Using Fast2SMS (India-based)
1. Create account: https://www.fast2sms.com
2. Get API key
3. Set environment variables:

```bash
firebase functions:config:set \
  sms.provider="fast2sms" \
  sms.fast2sms_api_key="your_api_key"
```

4. Deploy functions

---

## Verify SMS Provider Configuration

### Check if credentials are set:
```bash
firebase functions:config:get
```

You should see output like:
```
{
  "sms": {
    "provider": "twilio",
    "twilio_account_sid": "ACxxxxxx...",
    "twilio_auth_token": "your_token...",
    "twilio_phone_number": "+1234567890"
  }
}
```

### Check Cloud Functions Logs
```bash
firebase functions:log
```

Look for logs containing `[sendEmergencySms]`:
- ✅ `[sendEmergencySms] ✅ SMS sent to +919876543210`
- ❌ `[sendEmergencySms] ❌ Failed to send SMS to +919876543210: ...`
- ⚠️ `[SMS] To: +919876543210 Message: ...` (fallback logging)

---

## Testing Checklist

### Step 1: Add Emergency Contact
1. Open app
2. Go to Contacts → Add New Contact
3. Add a contact with:
   - Name: "Test Contact"
   - Phone: Valid 10-digit number (starts with 6-9 for India)
4. Save

### Step 2: Trigger Danger Alert
1. Open "ActiveLocation" page
2. Tap "I AM IN DANGER" button
3. Watch for:
   - ✅ Local notification on your phone
   - ✅ Alert dialog showing SMS status
   - Expected: "✅ SMS sent to 1 emergency contact(s)"

### Step 3: Check Logs
```bash
firebase functions:log | grep -i "sendEmergencySms"
```

Expected logs:
```
[sendEmergencySms] Sending emergency alert from John Doe
[sendEmergencySms] Target phones: +919876543210
[sendEmergencySms] ✅ SMS sent to +919876543210
[sendEmergencySms] Emergency logged. Success: 1, Failed: 0
```

### Step 4: Check Firestore
1. Go to Firebase Console
2. Firestore → notifications collection
3. Verify documents are created with:
   - `recipientPhone`: "+91..."
   - `status`: "DANGER"
   - `smsStatus`: "sent" or "failed"

### Step 5: Verify Contact Received SMS
- ✅ Contact's phone should receive SMS
- 📱 SMS content:
  ```
  🚨 EMERGENCY ALERT!
  John Doe is in DANGER and needs help!
  📍 Location: https://maps.google.com/?q=37.7749,-122.4194
  Please respond immediately!
  ```

---

## Troubleshooting

### Emergency Contact NOT Receiving SMS

#### Issue 1: Cloud Function Not Deployed
**Symptoms:**
- Alert shows: "⚠️ No SMS sent"
- Logs show: `callable sendEmergencySms failed`

**Solution:**
```bash
cd functions
npm install
firebase deploy --only functions
```

#### Issue 2: SMS Provider Credentials Missing
**Symptoms:**
- Logs show: `[SMS-FALLBACK] To: +919876543210...` (just logging, not sending)
- Alert shows: "SMS composer opened" (fallback used)

**Solution:**
```bash
# Check if credentials exist
firebase functions:config:get

# If empty, set them
firebase functions:config:set \
  sms.provider="twilio" \
  sms.twilio_account_sid="your_sid" \
  sms.twilio_auth_token="your_token" \
  sms.twilio_phone_number="+1234567890"

# Redeploy
firebase deploy --only functions
```

#### Issue 3: Invalid Phone Number Format
**Symptoms:**
- Logs show: `Twilio error: The 'To' number ... is invalid`
- Alert shows: SMS count = 0

**Solution:**
- Phone numbers must include country code
- Valid format: `+919876543210` (for India)
- Add country code when saving contact
- Update existing contacts with proper format

#### Issue 4: SMS Provider Account Issues
**Symptoms:**
- Logs show: `Twilio error: Unauthorized` or `Invalid credentials`

**Solution:**
- Verify account is active (not trial expired or balance depleted)
- Check credentials in Firebase console
- For Twilio: ensure phone number is verified
- For Fast2SMS: ensure API key is active

#### Issue 5: Using Expo Go
**Symptoms:**
- SMS composer may not work on Expo Go for some Android devices

**Solution:**
- Build standalone APK: `eas build -p android --profile preview`
- Test on real device with APK
- Cloud function should still work via callable

---

## Client-Side Behavior

### Dialog After Clicking "I AM IN DANGER"

**If SMS Sent Successfully:**
```
🚨 DANGER ALERT SENT
✅ SMS sent to 2 emergency contact(s)

Your location is being shared with all 
emergency contacts.

Status: IN DANGER
```

**If SMS Failed (but notification logged):**
```
🚨 DANGER ALERT SENT
⚠️ No SMS sent
❌ Failed to reach 2 contact(s)

Your location is being shared with all 
emergency contacts.

Status: IN DANGER
```

**If Error Occurred:**
```
Error
Failed to send alert. Please try again.
```

---

## Console Logs to Monitor

### Success Flow (View in Firebase Functions Logs)
```
[ActiveLocation] Attempt 1/2: Calling sendEmergencySms cloud function
[sendEmergencySms] Sending emergency alert from John Doe
[sendEmergencySms] Target phones: +919876543210, +918765432109
[sendEmergencySms] ✅ SMS sent to +919876543210
[sendEmergencySms] ✅ SMS sent to +918765432109
[sendEmergencySms] Emergency logged. Success: 2, Failed: 0
[ActiveLocation] Cloud function: SMS sent to 2 contact(s)
[ActiveLocation] Broadcast DANGER complete. Sent to 2 contact(s)
```

### Fallback Flow
```
[ActiveLocation] Attempt 1/2: Calling sendEmergencySms cloud function
[ActiveLocation] Attempt 1 cloud function failed: Error: ...
[ActiveLocation] Attempt 2/2: Calling sendEmergencySms cloud function
[ActiveLocation] Attempt 2 cloud function failed: Error: ...
[ActiveLocation] Cloud function failed, using device SMS composer as fallback
[ActiveLocation] ✅ SMS composer opened for 2 contact(s)
```

---

## Phone Number Format Requirements

### By Country:
| Country | Format | Example |
|---------|--------|---------|
| India | +91 + 10-digit | +919876543210 |
| USA | +1 + 10-digit | +12125551234 |
| UK | +44 + 10-digit | +442071234567 |
| Germany | +49 + number | +491301234567 |

**Rule:** Always include country code with `+` prefix

---

## Monitoring Dashboard

### Real-time Status Check
```bash
# Watch emergency logs
firebase firestore:watch emergency_logs --limit=10

# Watch notifications
firebase firestore:watch notifications --limit=10

# Check function logs
firebase functions:log | grep -E "sendEmergencySms|ActiveLocation"
```

---

## Emergency Contacts Setup

### Verify Emergency Contacts in Firestore
1. Go to Firebase Console
2. Firestore Database
3. Collection: `users` → Your UID
4. Field: `emergencyContacts` should show:
```
[
  { name: "Mom", phone: "+919876543210" },
  { name: "Dad", phone: "+918765432109" }
]
```

### Requirements:
- ✅ Phone field must exist and be non-empty
- ✅ Phone must start with + and country code
- ✅ Must be valid format for SMS provider

---

## What Happens Behind the Scenes

### When "I AM IN DANGER" is Clicked:

1. **Client-side:**
   - Sends local notification
   - Calls `broadcastStatusToContacts(userName, "DANGER", location)`
   - Updates user's Firestore status to `DANGER`
   - Calls cloud function with retry logic

2. **Cloud Function:**
   - Validates user is authenticated
   - Validates phone numbers array
   - For each phone number:
     - Calls SMS provider API
     - Logs success/failure
   - Creates document in `emergency_logs` collection
   - Returns { sentCount, failedCount }

3. **Firestore Updates:**
   - `users/{uid}/emergencyStatus` = "DANGER"
   - `notifications/{docId}` = alert document
   - `emergency_logs/{logId}` = SMS delivery log

4. **Emergency Contact Receives:**
   - 📱 SMS with location link and alert
   - ⏰ Timestamp of when alert was sent

---

## Getting Help

If SMS still not working:
1. Check Firebase Functions logs for errors
2. Verify SMS provider credentials are set
3. Ensure emergency contacts have valid phone numbers
4. Check that contacts are properly saved in Firestore
5. Test with Twilio test credentials first
6. Monitor `emergency_logs` collection for delivery status

---

## Version History
- **v2.0** (Current): Retry logic + detailed feedback + fallback SMS composer
- **v1.0**: Basic cloud function SMS sending
