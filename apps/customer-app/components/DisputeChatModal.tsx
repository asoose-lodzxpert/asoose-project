import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { io, Socket } from "socket.io-client";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { authConfig, getAccessToken } from "@/services/auth.service";
import {
  DisputeDetail,
  DisputeMessage,
  getDisputeDetail,
  sendDisputeMessage,
} from "@/services/dispute.service";
import { useAuth } from "@/context/AuthContext";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
interface Props {
  disputeId: string | null; // null  = modal closed
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
const SOCKET_URL = authConfig.apiBase.replace("/api/v1", "");

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#F59E0B",
  IN_REVIEW: "#3B82F6",
  RESOLVED: "#10B981",
  REJECTED: "#EF4444",
  CLOSED: "#6B7280",
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */
function Avatar({
  image,
  name,
  size = 32,
}: {
  image?: string;
  name: string;
  size?: number;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (image) {
    return (
      <Image
        source={{ uri: image }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: primary + "28",
        },
      ]}
    >
      <ThemedText
        style={[
          styles.avatarInitials,
          { color: primary, fontSize: size * 0.38 },
        ]}
      >
        {initials || "?"}
      </ThemedText>
    </View>
  );
}

function MessageBubble({ msg, isMe }: { msg: DisputeMessage; isMe: boolean }) {
  const primary = useThemeColor({}, "brandPrimary");
  const card = useThemeColor({}, "surfaceCard");
  const textPrimary = useThemeColor({}, "textPrimary");
  const muted = useThemeColor({}, "textMuted");

  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isAdmin = [
    "SUPER_ADMIN",
    "ADMIN",
    "ADMIN_SUPPORT",
    "ADMIN_MANAGER",
  ].includes(msg.sender.role);

  // Admin messages always go left; customer messages always go right
  const alignRight = isMe;
  const displayName = isAdmin ? "Support Agent" : msg.sender.name;

  return (
    <View style={[styles.row, alignRight ? styles.rowRight : styles.rowLeft]}>
      {/* Avatar – left side for received messages */}
      {!alignRight && (
        <Avatar
          image={msg.sender.image ?? undefined}
          name={displayName}
          size={30}
        />
      )}

      <View
        style={[
          styles.bubble,
          alignRight
            ? [styles.bubbleMe, { backgroundColor: primary }]
            : [styles.bubbleOther, { backgroundColor: card }],
        ]}
      >
        {!alignRight && (
          <ThemedText
            style={[styles.senderName, { color: isAdmin ? primary : muted }]}
          >
            {displayName}
          </ThemedText>
        )}
        <ThemedText
          style={[styles.msgText, { color: alignRight ? "#fff" : textPrimary }]}
        >
          {msg.message}
        </ThemedText>
        <View style={styles.timeRow}>
          <ThemedText
            style={[
              styles.msgTime,
              { color: alignRight ? "rgba(255,255,255,0.6)" : muted },
            ]}
          >
            {time}
          </ThemedText>
        </View>
      </View>

      {/* Avatar – right side for sent messages */}
      {alignRight && (
        <Avatar
          image={msg.sender.image ?? undefined}
          name={msg.sender.name}
          size={30}
        />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Main Modal                                                          */
/* ------------------------------------------------------------------ */
export default function DisputeChatModal({ disputeId, onClose }: Props) {
  const { user } = useAuth();

  /* Theme */
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textPrimary = useThemeColor({}, "textPrimary");
  const muted = useThemeColor({}, "textMuted");
  const subtle = useThemeColor({}, "surfaceSubtle");

  /* State */
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);

  const listRef = useRef<FlatList<DisputeMessage>>(null);
  const socketRef = useRef<Socket | null>(null);
  const isOpen = !!disputeId;

  /* -------------------------------------------------------------- */
  /* Fetch initial data                                               */
  /* -------------------------------------------------------------- */
  const load = useCallback(async () => {
    if (!disputeId) return;
    setLoading(true);
    try {
      const detail = await getDisputeDetail(disputeId);
      setDispute(detail);
      if (__DEV__)
        console.log(
          "Loaded dispute detail:",
          JSON.stringify(detail.messages, null, 2),
        );
      setMessages(detail.messages ?? []);
    } catch {
      // silently keep whatever we have
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  /* -------------------------------------------------------------- */
  /* Socket.IO connection (scoped to modal lifetime)                  */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    if (!isOpen || !disputeId) {
      // Clean up previous socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setDispute(null);
      setMessages([]);
      setDraft("");
      setConnected(false);
      return;
    }

    load();

    let cancelled = false;

    (async () => {
      const token = await getAccessToken();
      if (cancelled) return;

      const socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1500,
        reconnectionAttempts: 6,
        auth: { token },
      });

      socket.on("connect", () => {
        if (!cancelled) setConnected(true);
      });

      socket.on("disconnect", () => {
        if (!cancelled) setConnected(false);
      });

      // Listen for new dispute messages targeting this dispute
      socket.on(
        "dispute:message",
        (payload: { disputeId: string; message: DisputeMessage }) => {
          if (cancelled || payload.disputeId !== disputeId) return;
          setMessages((prev) => {
            // Deduplicate by id (sender already appended optimistically)
            const exists = prev.some((m) => m.id === payload.message.id);
            if (exists) return prev;
            return [...prev, payload.message];
          });
        },
      );

      socketRef.current = socket;
    })();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isOpen, disputeId, load]);

  /* Auto-scroll to bottom when messages change */
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  /* -------------------------------------------------------------- */
  /* Send message                                                     */
  /* -------------------------------------------------------------- */
  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !disputeId || sending) return;
    setSending(true);
    setDraft("");

    // Optimistic: fake local message while request is in flight
    const tempId = `temp_${Date.now()}`;
    const optimistic: DisputeMessage = {
      id: tempId,
      disputeId,
      senderId: user?.id ?? "",
      message: text,
      isInternal: false,
      createdAt: new Date().toISOString(),
      sender: {
        id: user?.id ?? "",
        name: user?.name ?? "You",
        role: "CUSTOMER",
        image: user?.avatarUrl ?? null,
      },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const saved = await sendDisputeMessage(disputeId, text);
      // Replace temp entry with real one
      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
    } catch {
      // Roll back optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(text); // restore draft so user can retry
    } finally {
      setSending(false);
    }
  };

  /* -------------------------------------------------------------- */
  /* Derived                                                          */
  /* -------------------------------------------------------------- */
  const canSend = dispute?.status === "OPEN" || dispute?.status === "IN_REVIEW";
  const statusColor = dispute
    ? (STATUS_COLORS[dispute.status] ?? "#6B7280")
    : "#6B7280";

  /* -------------------------------------------------------------- */
  /* Render                                                           */
  /* -------------------------------------------------------------- */
  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>

          <View style={styles.headerCenter}>
            <ThemedText style={styles.headerTitle} numberOfLines={1}>
              Dispute #{disputeId?.slice(-8).toUpperCase()}
            </ThemedText>
            {dispute && (
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusColor + "20" },
                ]}
              >
                <ThemedText style={[styles.statusText, { color: statusColor }]}>
                  {dispute.status.replace("_", " ")}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Online indicator */}
          <View style={styles.connIndicator}>
            <View
              style={[
                styles.connDot,
                { backgroundColor: connected ? "#10B981" : "#6B7280" },
              ]}
            />
          </View>
        </View>

        {/* ── Messages ── */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <IconSymbol name="chat" size={40} color={muted} />
                <ThemedText style={[styles.emptyText, { color: muted }]}>
                  No messages yet. Start the conversation.
                </ThemedText>
              </View>
            }
            renderItem={({ item }) => (
              <MessageBubble
                msg={item}
                isMe={item.sender.role === "CUSTOMER"}
              />
            )}
          />
        )}

        {/* ── Input ── */}
        {canSend && !loading && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
          >
            <View
              style={[
                styles.inputBar,
                { backgroundColor: card, borderTopColor: border },
              ]}
            >
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Type a message…"
                placeholderTextColor={muted}
                style={[
                  styles.textInput,
                  { color: textPrimary, backgroundColor: subtle },
                ]}
                multiline
                maxLength={1000}
                editable={!sending}
                returnKeyType="default"
              />
              <Pressable
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor:
                      draft.trim() && !sending ? primary : subtle,
                  },
                ]}
                onPress={handleSend}
                disabled={!draft.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <IconSymbol
                    name="paperplane.fill"
                    size={18}
                    color={draft.trim() ? "#fff" : muted}
                  />
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Closed state notice */}
        {!canSend && !loading && dispute && (
          <View
            style={[
              styles.closedBar,
              { backgroundColor: subtle, borderTopColor: border },
            ]}
          >
            <IconSymbol name="lock.fill" size={14} color={muted} />
            <ThemedText style={[styles.closedText, { color: muted }]}>
              This dispute is {dispute.status.toLowerCase()} — no new messages
              can be added.
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  closeBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  connIndicator: { width: 24, alignItems: "flex-end" },
  connDot: { width: 8, height: 8, borderRadius: 4 },

  /* Messages */
  listContent: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  /* Bubbles */
  row: {
    marginBottom: 6,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },

  /* Avatars */
  avatar: { flexShrink: 0 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontWeight: "700" },
  bubble: {
    minWidth: 80,
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 2,
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  senderName: { fontSize: 11, fontWeight: "700", marginBottom: 1 },
  msgText: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
  timeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  msgTime: { fontSize: 10 },

  /* Input */
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Closed bar */
  closedBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  closedText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
