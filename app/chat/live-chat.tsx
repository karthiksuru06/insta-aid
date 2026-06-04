import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../../components/ThemeContext";
import { faqData } from "../../constants/faqData";

/* ---------------- CLEAN TEXT ---------------- */
const normalize = (text: string) =>
  text
    ?.toLowerCase()
    ?.replace(/[^\w\s]/gu, "") // Keep it simple: remove punctuation
    ?.replace(/\s+/g, " ")
    ?.trim() || "";


/* ---------------- FAQ MATCHING ---------------- */
const getBestAnswer = (userQuestion: string) => {
  const userQ = normalize(userQuestion);
  let bestScore = 0;
  let bestAnswer: string | null = null;

  faqData.forEach((item) => {
    const q = normalize(item.Question);
    const ans = item.Answer;
    if (!q || !ans) return;

    let score = 0;
    const uWords = userQ.split(" ");
    const qWords = q.split(" ");

    score += uWords.filter((w) => qWords.includes(w)).length * 3;
    if (q.includes(userQ) || userQ.includes(q)) score += 4;

    if (score > bestScore) {
      bestScore = score;
      bestAnswer = ans;
    }
  });

  return bestScore >= 3 ? bestAnswer : null;
};


/* ================= LIVE CHAT ================= */
export default function LiveChat() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const isMounted = useRef(true);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /* ---------- COPY ---------- */
  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
  };

  /* ---------- LIKE / DISLIKE ---------- */
  const toggleLike = (index: number) => {
    setMessages((prev) =>
      prev.map((msg, i) =>
        i === index
          ? { ...msg, liked: !msg.liked, disliked: false }
          : msg
      )
    );
  };

  const toggleDislike = (index: number) => {
    setMessages((prev) =>
      prev.map((msg, i) =>
        i === index
          ? { ...msg, disliked: !msg.disliked, liked: false }
          : msg
      )
    );
  };

  /* ---------- BOT REPLY ---------- */
  const botReply = (text: string) => {
    const greetings = [
      "hi", "hello", "hey", "hai",
      "नमस्ते", "नमस्कार", // Hindi/Marathi
      "నమస్కారం", "హలో", // Telugu
      "ನಮಸ್ಕಾರ", "ಹಲೋ", // Kannada
      "નમસ્તે", "હેલો", // Gujarati
      "வணக்கம்", "ஹலோ", // Tamil
      "হ্যালো", "নমস্কার", // Bengali
      "ഹലോ", "നമസ്കാരം", // Malayalam
    ];
    
    const normalizedText = normalize(text);
    
    let reply =
      greetings.includes(normalizedText)
        ? t('liveChat.welcome') || "Hello! I am InstaAid's AI Assistant. How can I help you stay safe today?"
        : getBestAnswer(text) ||
        t('liveChat.fallback') || "I'm your InstaAid safety assistant. I couldn't understand that. Please ask me about InstaAid features, safety tips, or how to use the app!";

    setTyping(true);
    setTimeout(() => {
      if (!isMounted.current) return;
      setMessages((prev) => [
        ...prev,
        {
          text: reply,
          sender: "bot",
          liked: false,
          disliked: false,
        },
      ]);
      setTyping(false);
    }, 600);
  };


  /* ---------- SEND MESSAGE ---------- */
  const sendMessage = () => {
    if (!input.trim()) return;

    const msg = input.trim();
    setMessages((prev) => [...prev, { text: msg, sender: "user" }]);
    botReply(msg);
    setInput("");
  };

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, typing]);

  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#fff" }]}>
      {/* ---------- HEADER ---------- */}
      <View style={[styles.header, { backgroundColor: isDark ? "#1f1f1f" : "#FF6464" }]}>
        <Pressable onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#fff" />
        </Pressable>

        <Text style={styles.headerTitle}>{t('liveChat.title') || "InstaAid AI"}</Text>

        <View style={{ width: 26 }} />
      </View>

      {/* ---------- CHAT ---------- */}
      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.msgBubble,
              msg.sender === "user"
                ? [styles.userBubble, { backgroundColor: isDark ? "#333" : "#fff", borderColor: isDark ? "#444" : "#ddd" }]
                : [styles.botBubble, { backgroundColor: isDark ? "#E53935" : "#FF6464" }],
            ]}
          >
            <Text
              style={[
                styles.msgText,
                { color: msg.sender === "bot" ? "#fff" : (isDark ? "#fff" : "#000") },
              ]}
            >
              {msg.text}
            </Text>

            {/* BOT ACTIONS */}
            {msg.sender === "bot" && (
              <View style={styles.iconRow}>
                <Pressable onPress={() => copyToClipboard(msg.text)}>
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={16}
                    color="#fff"
                  />
                </Pressable>

                <Pressable onPress={() => toggleLike(i)}>
                  <MaterialCommunityIcons
                    name={msg.liked ? "thumb-up" : "thumb-up-outline"}
                    size={16}
                    color="#fff"
                  />
                </Pressable>

                <Pressable onPress={() => toggleDislike(i)}>
                  <MaterialCommunityIcons
                    name={msg.disliked ? "thumb-down" : "thumb-down-outline"}
                    size={16}
                    color="#fff"
                  />
                </Pressable>
              </View>
            )}
          </View>
        ))}

        {typing && (
          <View style={[styles.msgBubble, styles.botBubble, { backgroundColor: isDark ? "#E53935" : "#FF6464" }]}>
            <Text style={{ color: "#fff", fontStyle: "italic" }}>
              {t('liveChat.typing') || "Typing..."}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ---------- INPUT ---------- */}
      <View style={[styles.inputRow, { backgroundColor: isDark ? "#1f1f1f" : "#fff", borderColor: isDark ? "#333" : "#ddd" }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('liveChat.placeholder') || "Type a message..."}
          placeholderTextColor={isDark ? "#888" : "#999"}
          style={[styles.input, {
            backgroundColor: isDark ? "#2c2c2c" : "#fff",
            borderColor: isDark ? "#444" : "#ccc",
            color: isDark ? "#fff" : "#000"
          }]}
        />

        <Pressable style={[styles.sendBtn, { backgroundColor: isDark ? "#E53935" : "#FF6464" }]} onPress={sendMessage}>
          <MaterialCommunityIcons name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 14,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },

  chat: { flex: 1, padding: 16 },

  msgBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 14,
    marginVertical: 8,
  },

  userBubble: {
    alignSelf: "flex-end",
    borderWidth: 1,
  },

  botBubble: {
    alignSelf: "flex-start",
  },

  msgText: { fontSize: 15 },

  iconRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 8,
  },

  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    alignItems: "center",
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 45,
  },

  sendBtn: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
