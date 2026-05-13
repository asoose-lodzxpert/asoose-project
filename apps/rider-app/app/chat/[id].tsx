import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { chatService, ChatMessage } from "@/services/chat.service";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

export default function ChatScreen() {
  const { id: otherId, name, orderId, rideId } = useLocalSearchParams<{
    id: string;
    name: string;
    orderId?: string;
    rideId?: string;
  }>();
  const { user } = useAuth();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const colors = {
    background: useThemeColor({}, "surfaceBackground"),
    card: useThemeColor({}, "surfaceCard"),
    primary: useThemeColor({}, "brandPrimary"),
    text: useThemeColor({}, "textPrimary"),
    muted: useThemeColor({}, "textMuted"),
    border: useThemeColor({}, "borderDefault"),
  };

  useEffect(() => {
    fetchMessages();
  }, [otherId, orderId, rideId]);

  const fetchMessages = async () => {
    try {
      const data = await chatService.getMessages(otherId, orderId, rideId);
      setMessages(data);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    setSending(true);
    const text = inputText.trim();
    setInputText("");

    try {
      const isAdmin = otherId === "admin";
      const newMessage = await chatService.sendMessage({
        receiverId: isAdmin ? "admin" : otherId,
        receiverType: isAdmin ? "ADMIN" : "CUSTOMER",
        message: text,
        orderId,
        rideId,
      });
      setMessages((prev) => [...prev, newMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (error) {
      console.error("Failed to send message:", error);
      setInputText(text); // Restore text on failure
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id;

    return (
      <View
        style={[
          styles.messageWrapper,
          isMe ? styles.myMessageWrapper : styles.theirMessageWrapper,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe
              ? [styles.myBubble, { backgroundColor: colors.primary }]
              : [styles.theirBubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }],
          ]}
        >
          <ThemedText style={[styles.messageText, { color: isMe ? "#FFF" : colors.text }]}>
            {item.message}
          </ThemedText>
        </View>
        <ThemedText style={[styles.timestamp, { color: colors.muted }]}>
          {format(new Date(item.createdAt), "HH:mm")}
        </ThemedText>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: name || "Chat",
          headerBackTitle: "Back",
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={{ backgroundColor: colors.background }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.quickActions}
          >
            {[
              "I have arrived",
              "Where are you?",
              "At the delivery location",
              "Please confirm availability",
              "Order picked up",
              "Stuck in traffic"
            ].map((text) => (
              <Pressable
                key={text}
                onPress={() => {
                  setInputText(text);
                  // Optional: handleSend() directly? Maybe just set text for review.
                }}
                style={[styles.quickActionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <ThemedText style={styles.quickActionText}>{text}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View
          style={[
            styles.inputContainer,
            { paddingBottom: bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          <ThemedInput
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            containerStyle={styles.input}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            style={[
              styles.sendBtn,
              { backgroundColor: inputText.trim() ? colors.primary : colors.muted + "20" },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <IconSymbol name="paperplane.fill" size={20} color="#FFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  messageWrapper: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  myMessageWrapper: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  theirMessageWrapper: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    marginRight: 10,
    minHeight: 44,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  quickActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
