import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ i18n
import {
  Alert,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useTheme } from "../../components/ThemeContext";
import { auth, db } from "../../firebaseConfig";
import { saveContactFormSubmission } from "../../services/firebaseServices";

const ContactUsScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation(); // ✅ translation hook
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [adminStatus, setAdminStatus] = useState<{ id: string, status: string } | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme === "dark" ? "#111" : "#fff" },

    // 🔹 Header styling
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between", // important
      paddingHorizontal: 18,
      paddingTop: 50,
      paddingBottom: 18,
      borderBottomWidth: 0.5,
      borderBottomColor: theme === "dark" ? "#555" : "#ddd",
    },

    // rename backButton → sideButton (better)
    backButton: {
      width: 40,              // equal spacing
      alignItems: "center",
      justifyContent: "center",
    },

    headerTitle: {
      flex: 1,
      fontSize: 22,           // koncham big
      fontWeight: "700",
      textAlign: "center",
      color: theme === "dark" ? "#fff" : "#000",
    },

    heroContainer: {
      alignItems: "center",
      marginVertical: 12,
      marginBottom: 25,
    },
    heroImage: { width: "90%", height: 180 },

    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 18, color: theme === "dark" ? "#fff" : "#000" },

    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme === "dark" ? "#222" : "#fff",
      padding: 15,
      borderRadius: 10,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    iconWrapper: {
      backgroundColor: "#FEE2E2",
      padding: 8,
      borderRadius: 30,
      marginRight: 12,
    },
    cardTitle: { fontSize: 15, fontWeight: "500", color: theme === "dark" ? "#fff" : "#000" },
    cardSubtitle: { fontSize: 13, color: theme === "dark" ? "#ccc" : "#666" },

    input: {
      borderWidth: 1,
      borderColor: theme === "dark" ? "#555" : "#ddd",
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
      fontSize: 15,
      color: theme === "dark" ? "#fff" : "#000",
      backgroundColor: theme === "dark" ? "#333" : "#f5f5f5",
    },

    sendButton: {
      backgroundColor: "#EF4444",
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 8,
    },
    sendButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

    socialRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 20,
    },
    socialButton: {
      width: 50,
      height: 50,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.2,
      borderColor: theme === "dark" ? "#555" : "#ddd",
      borderRadius: 25,
      marginHorizontal: 10,
    },
  }), [theme]);

  // Listen for admin status on feedback
  React.useEffect(() => {
    const user = auth.currentUser;
    console.log('ContactUsScreen useEffect: user', user?.uid);
    if (!user) return;
    const q = query(
      collection(db, "contactSubmissions"),
      where("userId", "==", user.uid),
      where("userSeen", "==", false)
    );
    console.log('ContactUsScreen Firestore query:', q);
    const unsub = onSnapshot(q, (snap) => {
      console.log('ContactUsScreen onSnapshot docs:', snap.docs.map(d => ({ id: d.id, ...d.data() })));
      const docSnap = snap.docs.find(d => ["ASSIGNED", "RESOLVED"].includes(d.data().status));
      if (docSnap) {
        console.log('ContactUsScreen found adminStatus:', docSnap.id, docSnap.data().status);
        setAdminStatus({ id: docSnap.id, status: docSnap.data().status });
      } else {
        setAdminStatus(null);
      }
    });
    return () => unsub();
  }, []);

  const handleSocialMediaPress = (platform: string) => {
    if (platform === "blog") {
      // Navigate internally to blog page
      router.push("./blog");
      return;
    }

    let url = "";
    switch (platform) {
      case "youtube":
        url = "https://www.youtube.com/@Instaaid-w9z";
        break;
      case "instagram":
        url = "https://www.instagram.com/instaaid2026";
        break;
      default:
        break;
    }
    if (url) {
      Linking.openURL(url);
    }
  };

  const handleSubmit = async () => {
    if (!name || !email || !message) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to send feedback.');
        return;
      }
      console.log('ContactUsScreen handleSubmit: userId', user.uid);
      await saveContactFormSubmission({ name, email, message, userId: user.uid });
      // Log feedback submission alert to Firestore
      await addDoc(collection(db, 'alerts'), {
        userId: user.uid,
        type: 'feedback_submitted',
        details: { name, email, message },
        timestamp: serverTimestamp(),
        read: false,
      });
      Alert.alert('Success', 'Your message has been sent!');
      setName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      console.log('ContactUsScreen handleSubmit error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleAdminStatusOk = async () => {
    if (adminStatus) {
      await updateDoc(doc(db, "contactSubmissions", adminStatus.id), { userSeen: true });
      setAdminStatus(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/Settings")}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={30}
              color={theme === "dark" ? "#fff" : "#000"}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t('contactUs')}</Text>

          {/* empty view for balance */}
          <View style={styles.backButton} />
        </View>


        {/* Show admin status message if assigned or resolved (moved up for visibility) */}
        {adminStatus && (
          <View style={{ backgroundColor: "#fef3f3", padding: 16, borderRadius: 8, margin: 16, marginBottom: 0 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
              {adminStatus.status === "ASSIGNED"
                ? "Your issue has been assigned."
                : "Your issue has been resolved."}
            </Text>
            <TouchableOpacity onPress={handleAdminStatusOk} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
              <Text style={{ color: "#ED4C4C", fontWeight: "bold" }}>OK</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🔹 Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={require("../../assets/images/contact_hero.jpg")}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* 🔹 Get in Touch Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('getInTouch')}</Text>
          <TouchableOpacity style={styles.card} onPress={() => Linking.openURL('mailto:instaaid08@gmail.com')}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name="email-outline"
                size={24}
                color="#EF4444"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('emailSupport')}</Text>
              <Text style={styles.cardSubtitle}>instaaid08@gmail.com</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={22} color="gray" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => Linking.openURL('tel:+919652311572')}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name="phone-outline"
                size={24}
                color="#EF4444"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('callUs')}</Text>
              <Text style={styles.cardSubtitle}>+91-9652311572</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={22} color="gray" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => router.push('/chat/live-chat')}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name="chat-outline"
                size={24}
                color="#EF4444"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('liveChatLabel')}</Text>
              <Text style={styles.cardSubtitle}>{t('startConversation')}</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={22} color="gray" />
          </TouchableOpacity>
        </View>


        {/* 🔹 Contact Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('contactForm')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('yourName')}
            placeholderTextColor={theme === "dark" ? "#999" : "#444"}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder={t('yourEmail')}
            placeholderTextColor={theme === "dark" ? "#999" : "#444"}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            placeholder={t('yourMessage')}
            placeholderTextColor={theme === "dark" ? "#999" : "#444"}
            multiline
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSubmit}>
            <Text style={styles.sendButtonText}>{t('sendMessage')}</Text>
          </TouchableOpacity>
        </View>

        {/* 🔹 Social Media */}
        <View style={[styles.section, { paddingBottom: 40 }]}>
          <Text style={styles.sectionTitle}>{t('connectWithUs')}</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity
              onPress={() => handleSocialMediaPress("youtube")}
              style={styles.socialButton}
            >
              <FontAwesome5 name="youtube" size={22} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSocialMediaPress("instagram")}
              style={styles.socialButton}
            >
              <FontAwesome5 name="instagram" size={22} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSocialMediaPress("blog")}
              style={styles.socialButton}
            >
              <FontAwesome5 name="pen-nib" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* (Removed duplicate admin status message from bottom) */}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ContactUsScreen;