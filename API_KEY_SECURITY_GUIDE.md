# Securing Google Maps API Keys

During our security audit, we noticed your Google Maps API key is present in `app.json`. Because mobile applications can be decompiled, embedding the API key in the app configuration means malicious actors could extract it.

To prevent quota theft and unexpected billing charges, you **must** restrict this API key within the Google Cloud Console.

## Steps to Restrict the API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project (`instaaid-43394` or similar).
3. Navigate to **APIs & Services > Credentials**.
4. Click on your Google Maps API Key (`AIzaSyBNN-d18ZNLvoj6-YrfNP0cJk5VmCh0JaY`).
5. Under **Application restrictions**, select **Android apps** (and/or iOS apps).
   - Click **Add an item**.
   - Enter your package name: `com.instaaid.app` (from your `app.json`).
   - Enter the SHA-1 certificate fingerprint of your app signing key (you can get this from Google Play Console or your local keystore using `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`).
6. Under **API restrictions**, choose **Restrict key** and select only the APIs your app needs (e.g., Maps SDK for Android, Places API, Directions API).
7. Click **Save**.

By following these steps, even if someone decompiles your APK and extracts the API key, Google will reject any API requests that do not originate from your cryptographically signed application.
