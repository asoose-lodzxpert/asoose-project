"use client";

import React, { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { 
  Search, 
  Send, 
  User, 
  MessageSquare, 
  Package, 
  Navigation,
  Loader2,
  Clock
} from "lucide-react";
import { fetcher } from "../hooks/useSuperAdminFetch";
import { useSession } from "next-auth/react";
import { formatDateTime, formatTimeOnly } from "@/utils/formatDate";
import { socketService } from "@/services/socket.service";

interface ChatMessage {
  id: string;
  senderId: string;
  senderType: string;
  receiverId: string;
  receiverType: string;
  message: string;
  isRead: boolean;
  orderId?: string;
  rideId?: string;
  createdAt: string;
}

interface Conversation {
  otherId: string;
  otherType: string;
  otherName: string;
  otherAvatar: string | null;
  otherPhone: string | null;
  orderId?: string;
  rideId?: string;
  lastMessage: ChatMessage;
}

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  const token = (session as any)?.accessToken || (session?.user as any)?.accessToken;
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function ChatsPage() {
  const { data: session } = useSession();
  const adminId = (session as any)?.user?.id || (session as any)?.id;
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, mutate: mutateConvs, isLoading: loadingConvs } = useSWR<Conversation[]>(
    "/chat/conversations",
    fetcher,
    { refreshInterval: 10000 }
  );

  useEffect(() => {
    if (selectedConv) {
      const fetchMessages = async () => {
        const query = new URLSearchParams({
          ...(selectedConv.orderId && { orderId: selectedConv.orderId }),
          ...(selectedConv.rideId && { rideId: selectedConv.rideId }),
        }).toString();
        const data = await apiFetch(`/chat/messages/${selectedConv.otherId}?${query}`);
        setMessages(data);
        setTimeout(scrollToBottom, 100);
      };
      fetchMessages();
    }
  }, [selectedConv]);

  useEffect(() => {
    const handleNewMessage = (msg: ChatMessage) => {
      if (selectedConv && 
          (msg.senderId === selectedConv.otherId || msg.receiverId === selectedConv.otherId) &&
          (msg.orderId === selectedConv.orderId || msg.rideId === selectedConv.rideId)) {
        setMessages(prev => [...prev, msg]);
        setTimeout(scrollToBottom, 100);
      }
      mutateConvs();
    };

    socketService.on("new_chat_message", handleNewMessage);
    return () => {
      socketService.off("new_chat_message", handleNewMessage);
    };
  }, [selectedConv, mutateConvs]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    setSending(true);
    try {
      const msg = await apiFetch("/chat/send", {
        method: "POST",
        body: JSON.stringify({
          receiverId: selectedConv.otherId,
          receiverType: selectedConv.otherType,
          message: newMessage.trim(),
          orderId: selectedConv.orderId,
          rideId: selectedConv.rideId,
        }),
      });
      setMessages(prev => [...prev, msg]);
      setNewMessage("");
      setTimeout(scrollToBottom, 100);
      mutateConvs();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = conversations?.filter(c => 
    c.otherName.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-140px)] bg-[#0F172A] rounded-2xl border border-gray-800 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-800 flex flex-col bg-[#1E293B]">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white mb-4">Support Chats</h1>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingConvs ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
            </div>
          ) : filteredConvs?.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No active chats</p>
            </div>
          ) : (
            filteredConvs?.map((conv) => (
              <div
                key={`${conv.otherId}_${conv.orderId || conv.rideId}`}
                onClick={() => setSelectedConv(conv)}
                className={`p-4 cursor-pointer border-b border-gray-800/50 transition-colors hover:bg-white/5 ${
                  selectedConv?.otherId === conv.otherId && 
                  selectedConv?.orderId === conv.orderId && 
                  selectedConv?.rideId === conv.rideId 
                    ? "bg-yellow-500/10 border-l-4 border-l-yellow-500" 
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {conv.otherAvatar ? (
                      <img src={conv.otherAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-bold text-white text-sm truncate">
                        {conv.otherName}
                      </span>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {formatTimeOnly(conv.lastMessage.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {conv.lastMessage.message}
                    </p>
                    { (conv.orderId || conv.rideId) && (
                      <div className="flex items-center gap-1 mt-1">
                        {conv.orderId ? (
                          <Package className="w-3 h-3 text-yellow-500" />
                        ) : (
                          <Navigation className="w-3 h-3 text-blue-500" />
                        )}
                        <span className="text-[9px] font-mono text-gray-500 uppercase">
                          ID: {(conv.orderId || conv.rideId || "").substring(0, 8)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0F172A]">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                  {selectedConv.otherAvatar ? (
                    <img src={selectedConv.otherAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">{selectedConv.otherName}</h2>
                  <p className="text-xs text-gray-500">
                    {selectedConv.otherType} {selectedConv.otherPhone ? `• ${selectedConv.otherPhone}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {selectedConv.orderId && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Related Order</span>
                    <span className="text-xs text-yellow-500 font-mono">#{selectedConv.orderId.substring(0, 8).toUpperCase()}</span>
                  </div>
                )}
                {selectedConv.rideId && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Related Ride</span>
                    <span className="text-xs text-blue-500 font-mono">#{selectedConv.rideId.substring(0, 8).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
            >
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === adminId || msg.senderType === "ADMIN" || msg.senderType === "SUPER_ADMIN";
                const showDate = idx === 0 || formatDateTime(msg.createdAt).split(",")[0] !== formatDateTime(messages[idx-1].createdAt).split(",")[0];

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="bg-slate-800 text-gray-500 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                          {formatDateTime(msg.createdAt).split(",")[0]}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] group`}>
                        <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isMe 
                            ? "bg-yellow-500 text-black font-medium rounded-tr-none" 
                            : "bg-[#1E293B] text-white border border-gray-700 rounded-tl-none"
                        }`}>
                          {msg.message}
                        </div>
                        <div className={`flex items-center gap-2 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                          <span className="text-[10px] text-gray-500">
                            {formatTimeOnly(msg.createdAt)}
                          </span>
                          {!isMe && msg.isRead && (
                            <div className="w-1 h-1 rounded-full bg-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-800 bg-[#1E293B]">
              <div className="flex items-end gap-2 bg-[#0F172A] border border-gray-700 rounded-xl p-2 focus-within:border-yellow-500 transition-colors">
                <textarea
                  rows={1}
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white py-2 px-2 resize-none max-h-32"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 disabled:opacity-40 transition-all flex-shrink-0 shadow-md active:scale-95"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 ml-1 italic">
                Press Enter to send, Shift + Enter for new line.
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-12">
            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6">
              <MessageSquare className="w-12 h-12 opacity-20" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Select a Conversation</h3>
            <p className="text-center max-w-sm">
              Choose a message from the list on the left to start assisting riders or customers in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
