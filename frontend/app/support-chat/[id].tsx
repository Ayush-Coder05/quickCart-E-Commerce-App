import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStoredUser } from "../../utils/api";

const PRIMARY = "#16A34A";
const BG_COLOR = "#F3F4F6";
const TEXT_DARK = "#1F2937";
const GRAY_LIGHT = "#E5E7EB";

export default function SupportChatScreen() {
  const insets = useSafeAreaInsets();
  const { id: orderId } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string>("");
  const flatListRef = useRef<FlatList>(null);
  
  const chatId = typeof orderId === "string" ? orderId : "";
  const storageKey = `@quickcart_chat_${chatId}`;

  useEffect(() => {
    async function load() {
      const user = await getStoredUser();
      if (user) {
        setUserId(user.id || user.uid);
      }
      const raw = await AsyncStorage.getItem(storageKey).catch(() => null);
      if (raw) {
        try {
          setMessages(JSON.parse(raw));
        } catch {}
      } else {
        const welcome = [
          {
            id: "msg_welcome",
            text: "Hello! How can we assist you with this order today?",
            senderId: "support",
            senderName: "QuickCart Support",
            timestamp: new Date().toISOString(),
          },
        ];
        setMessages(welcome);
        AsyncStorage.setItem(storageKey, JSON.stringify(welcome)).catch(() => {});
      }
    }
    load();
  }, [chatId]);

  const handleSend = async () => {
    if (!text.trim() || !chatId) return;
    
    const newMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      senderId: userId || "me",
      senderName: "Customer",
      timestamp: new Date().toISOString(),
    };
    
    const updated = [...messages, newMessage];
    setMessages(updated);
    setText("");
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => {});

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulated quick support reply
    setTimeout(async () => {
      const reply = {
        id: (Date.now() + 1).toString(),
        text: "Thanks for reaching out! A support representative will review your message shortly.",
        senderId: "support",
        senderName: "QuickCart Support",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => {
        const next = [...prev, reply];
        AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
        return next;
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === userId || item.senderId === "me";
    const timeStr = new Date(item.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    return (
      <View style={[styles.messageBubble, isMe ? styles.messageMe : styles.messageAdmin]}>
        <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextAdmin]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeAdmin]}>
          {timeStr}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Support Chat</Text>
          <Text style={styles.headerSubtitle}>Order #{chatId.slice(-8)}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={setText}
          multiline
        />
        <Pressable onPress={handleSend} style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}>
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG_COLOR },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_LIGHT,
    gap: 12,
  },
  iconBtn: { padding: 4 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: TEXT_DARK },
  headerSubtitle: { fontSize: 12, color: "#6B7280" },
  listContent: { padding: 16, gap: 12 },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    padding: 12,
    marginBottom: 4,
  },
  messageMe: {
    alignSelf: "flex-end",
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 4,
  },
  messageAdmin: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: GRAY_LIGHT,
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextMe: { color: "#fff" },
  messageTextAdmin: { color: TEXT_DARK },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  messageTimeMe: { color: "rgba(255, 255, 255, 0.7)" },
  messageTimeAdmin: { color: "#9CA3AF" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: GRAY_LIGHT,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: GRAY_LIGHT,
    fontSize: 15,
    color: TEXT_DARK,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
