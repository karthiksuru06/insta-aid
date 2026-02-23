import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "../../components/ThemeContext";

export default function SplashScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const hasNavigated = useRef(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Run animations in parallel
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after 4 seconds
    const timer = setTimeout(async () => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      
      try {
        console.log('🔄 [SPLASH] Starting navigation logic...');
        const storage = (await import('@react-native-async-storage/async-storage')).default;
        const { onAuthStateChanged } = await import('firebase/auth');
        const authModule = (await import('../../firebaseConfig')).auth;

        // Check auth state with timeout
        let user = null;
        let finished = false;

        const unsub = onAuthStateChanged(authModule, (u) => {
          if (!finished) {
            finished = true;
            user = u;
            console.log('✅ [SPLASH] Auth state:', u?.email || 'No user');
            try { unsub(); } catch {}
          }
        });

        // Wait max 2 seconds for auth
        await new Promise(resolve => setTimeout(resolve, 2000));
        finished = true;

        if (user) {
          console.log('✅ [SPLASH] User logged in, checking setup state');
          const userKey = user.email || user.uid;
          const firstLoginFlag = await storage.getItem(`first_login_${userKey}`);
          const permissionsCompleted = await storage.getItem(`permissions_completed_${userKey}`);
          const safetyCompleted = await storage.getItem(`safety_completed_${userKey}`);

          if (firstLoginFlag && safetyCompleted) {
            // Full setup completed - go to Home
            console.log('📍 [SPLASH] Returning user - Homepage');
            router.replace('(tabs)');
          } else if (permissionsCompleted && !safetyCompleted) {
            // Permissions done but safety setup incomplete - resume at SafetyFeatures
            console.log('📍 [SPLASH] Permissions done, resuming SafetyFeatures');
            router.replace('features/SafetyFeatures');
          } else {
            // Brand new user - start at EnablePermissions
            console.log('📍 [SPLASH] First login - EnablePermissions');
            router.replace('features/EnablePermissions');
          }
        } else {
          console.log('✅ [SPLASH] No user logged in');
          const hasSeenOnboarding = await storage.getItem('hasSeenOnboarding');
          
          if (!hasSeenOnboarding) {
            console.log('📍 [SPLASH] First time - welcome screen');
            router.replace('auth/welcome');
          } else {
            console.log('📍 [SPLASH] Returning visitor - Login');
            router.replace('Login');
          }
        }
      } catch (e) {
        console.error('❌ [SPLASH] Error:', e);
        console.log('📍 [SPLASH] Fallback - welcome screen');
        router.replace('auth/welcome');
      }
    }, 4000);

    return () => {
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme === "dark" ? "#111" : "#FFFFFF" }]}>
      {/* Logo with fade + scale */}
      <Animated.Image
        source={require("../../assets/images/image.png")}
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />

      {/* App Name with fade + slide */}
      <Animated.Text
        style={[
          styles.title,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            color: theme === "dark" ? "#fff" : "#2D3748",
          },
        ]}
      >
        InstAID
      </Animated.Text>

      {/* Tagline with fade + slide */}
      <Animated.Text
        style={[
          styles.subtitle,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            color: theme === "dark" ? "#ccc" : "#718096",
          },
        ]}
      >
        Shake. Alert. Stay Safe.
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    resizeMode: "contain",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2D3748",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#718096",
    marginTop: 8,
    letterSpacing: 1,
  },
});
