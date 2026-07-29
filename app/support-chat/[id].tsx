import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, auth } from "../../utils/firebase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#16A34A";
const BG_COLOR = "#F3F4F6";
const TEXT_DARK = "#1F2937";
const GRAY_LIGHT = "#E5E7EB";

export default function SupportChatScreen() {
  const insets = useSafeAreaInsets();
  const { id: orderId } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  
  const user = auth.currentUser;
  // We'll use orderId as the chatId for 1:1 relation, or generated. 
  // Using orderId is easiest to link them.
  const chatId = typeof orderId === "string" ? orderId : "";

  useEffect(() => {
    if (!chatId || !user) return;
    
    const chatRef = doc(db, "supportChats", chatId);
    const unsub = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMessages(data.messages || []);
      } else {
        // Create it if it doesn't exist
        setDoc(chatRef, {
          orderId: chatId,
          userId: user.uid,
          messages: []
        });
      }
      setLoading(false);
    });
    
    return () => unsub();
  }, [chatId, user]);

  const handleSend = async () => {
    if (!text.trim() || !user || !chatId) return;
    
    const newMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      senderId: user.uid,
      senderName: "Customer",
      timestamp: new Date().toISOString(),
    };
    
    setText("");
    
    const chatRef = doc(db, "supportChats", chatId);
    try {
      await updateDoc(chatRef, {
        messages: arrayUnion(newMessage)
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.uid;
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
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(i) => i.id || i.timestamp}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          multiline
        />
        <Pressable style={[styles.sendBtn, !text.trim() && { opacity: 0.5 }]} onPress={handleSend} disabled={!text.trim()}>
          <Ionicons name="send" size={18} color="#fff" />
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
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_LIGHT,
  },
  iconBtn: { padding: 4 },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { color: TEXT_DARK, fontSize: 18, fontWeight: "bold" },
  headerSubtitle: { color: "#6B7280", fontSize: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  chatContainer: { padding: 16, flexGrow: 1, justifyContent: "flex-end" },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
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
  messageTimeMe: { color: "rgba(255,255,255,0.7)" },
  messageTimeAdmin: { color: "#9CA3AF" },
  
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: GRAY_LIGHT,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: GRAY_LIGHT,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 44,
  },
  sendBtn: {
    backgroundColor: PRIMARY,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
});
