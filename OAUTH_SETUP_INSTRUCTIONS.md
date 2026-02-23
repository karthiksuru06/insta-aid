# Google OAuth 2.0 Credentials Setup Guide

## 📍 Your Project Details
- **Firebase Project**: instaaid-43394
- **Project Number**: 181830039349
- **Android Package**: com.pulagam.shaketoshare
- **App Scheme**: instaaid

---

## ✅ Step-by-Step: Create OAuth 2.0 Client IDs

### **Step 1: Open Google Cloud Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. At the top, click the **Project Selector dropdown**
3. Search for and select **instaaid-43394**

---

### **Step 2: Enable Google+ API**

1. In the left sidebar, click **APIs & Services**
2. Click **Enabled APIs & services**
3. Click **+ ENABLE APIS AND SERVICES** button
4. Search for **"Google+ API"** or **"Identity and Access Management API"**
5. Click **Enable** (if not already enabled)

---

### **Step 3: Configure OAuth Consent Screen**

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** as User Type
3. Click **Create**
4. Fill in the form:
   - **App name**: ShakeToShare (or InstaAid)
   - **User support email**: instaaid08@gmail.com
   - **Developer contact information**: instaaid08@gmail.com
5. Click **Save and Continue**
6. On "Scopes" page, click **Save and Continue**
7. On "Test users" page, click **Save and Continue**
8. Review and click **Back to Dashboard**

---

### **Step 4: Create Web Client ID**

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Web application**
4. Fill in:
   - **Name**: ShakeToShare Web Client
   - **Authorized JavaScript origins**: 
     ```
     http://localhost:19000
     http://localhost:19001
     http://localhost:8081
     https://instaaid-43394.firebaseapp.com
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:19000/callback
     exp+instaaid://oauth-redirect/google
     https://instaaid-43394.firebaseapp.com/__/auth/handler
     ```
5. Click **Create**
6. Copy the **Client ID** (format: `181830039349-xxxxxxxxx.apps.googleusercontent.com`)
7. Click **OK**

---

### **Step 5: Create Android Client ID**

1. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Select **Android**
3. Fill in:
   - **Name**: ShakeToShare Android
   - **Package name**: `com.pulagam.shaketoshare`
   - **SHA-1 certificate fingerprint**: `c5:d3:52:8c:00:ee:ae:8b:68:f6:76:5f:ec:82:d9:6d:c0:99:e6:36` (from Firebase Console)

4. Click **Create**
5. Copy the **Client ID** 
6. Note: You'll see it shows the SHA-1 fingerprint you entered
7. Click **OK**

---

### **Step 6: Create iOS Client ID**

1. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Select **iOS**
3. Fill in:
   - **Name**: ShakeToShare iOS
   - **Bundle ID**: `com.pulagam.shaketoshare` (or get from your iOS project)
   - (Optional) **App Store ID**: Leave blank if not on App Store yet
   - (Optional) **Team ID**: Leave blank for now

4. Click **Create**
5. Copy the **Client ID**
6. Click **OK**

---

## 📋 Your OAuth Client IDs (Verified ✅)

Your Google Cloud project has these OAuth Client IDs created:

```
Web Client ID:
181830039349-ma87eouo2epb9p7hp3ktv38o6dkt2sti.apps.googleusercontent.com

Android Client ID:
181830039349-55li20jhjgejcguthk2afd0hi01r7ioj.apps.googleusercontent.com
```

**Status**: ✅ Verified in Google Cloud Console

---

## 🔧 Verify Your Credentials in Google Cloud Console

### View All Credentials:
1. Go to **APIs & Services** → **Credentials**
2. You should see three OAuth 2.0 Client IDs:
   - ✅ **Web application** (ShakeToShare Web Client)
   - ✅ **Android** (ShakeToShare Android)
   - ✅ **iOS** (ShakeToShare iOS)

### Edit Android Client (Add Redirect URI):
1. Click on your **Android Client ID**
2. Scroll down to **Authorized redirect URIs**
3. Add (if not already there):
   ```
   exp+instaaid://oauth-redirect/google
   ```
4. Click **Save**

---

## ✅ Verification Checklist

- [ ] Google+ API is enabled
- [ ] OAuth consent screen is configured
- [ ] Web Client ID created
- [ ] Android Client ID created with correct SHA-1 fingerprint
- [ ] iOS Client ID created
- [ ] Android client has redirect URI: `exp+instaaid://oauth-redirect/google`
- [ ] All three client IDs match the ones in your code

---

## 🔗 Client IDs Used in Your Code

These are already configured in your `Login.tsx`:

```typescript
const [request, response, promptAsync] = useGoogleAuthRequest(
  '181830039349-ma87eouo2epb9p7hp3ktv38o6dkt2sti.apps.googleusercontent.com', // Web Client ID
  '181830039349-ma87eouo2epb9p7hp3ktv38o6dkt2sti.apps.googleusercontent.com', // iOS Client ID
  '181830039349-55li20jhjgejcguthk2afd0hi01r7ioj.apps.googleusercontent.com'   // Android Client ID
);
```

---

## 🧪 Test Your Setup

After creating the credentials:

1. **Start Expo dev server**:
   ```bash
   expo start
   ```

2. **Scan QR code with Expo Go**

3. **Test Google Sign-In**:
   - Click "Sign In with Google"
   - You should see Google OAuth consent screen
   - After authentication, you should be logged in

4. **Check for errors**:
   - Look in console for `[GOOGLE AUTH]` logs
   - Common errors will be logged with ❌ prefix

---

## 🐛 If You Get Errors

### Error: "Invalid Client ID"
- ✅ **Solution**: Verify Client ID in `Login.tsx` matches Google Cloud Console

### Error: "Redirect URI mismatch"
- ✅ **Solution**: Add `exp+instaaid://oauth-redirect/google` to Android client redirect URIs

### Error: "OAuth consent screen not configured"
- ✅ **Solution**: Complete the OAuth consent screen setup (Step 3 above)

### Error: "SHA-1 fingerprint does not match"
- ✅ **Solution**: Copy exact SHA-1 from Firebase Console (already shown above)

---

## 📞 Need Help?

If you're stuck on any step:
1. Screenshot the error and share it
2. Tell me which step you're on
3. I can help you troubleshoot

---

**Status**: Follow the steps above, then test in Expo Go
**Last Updated**: Feb 3, 2026
