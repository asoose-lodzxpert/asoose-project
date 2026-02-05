"use client";
import React, { useState } from "react";
import { Send, AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
import { DisputeDetail } from "../types";
interface Props {
  messages: DisputeDetail["messages"];
  canAddMessage: boolean;
  onSendMessage: (msg: string, isInternal: boolean) => Promise<void>;
}

export default function DisputeChat({
  messages,
  canAddMessage,
  onSendMessage,
}: Props) {
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!replyMessage.trim()) return;
    setSending(true);
    await onSendMessage(replyMessage, isInternal);
    setReplyMessage("");
    setIsInternal(false);
    setSending(false);
  };

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
      <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <Send className="w-5 h-5" /> Communication
      </h2>

      <div className="space-y-6 mb-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-gray-500 italic">
            No messages yet.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = ["SUPER_ADMIN", "ADMIN"].includes(msg.sender.role);
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`flex items-center gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <span className="text-xs font-bold text-gray-300">
                    {msg.sender.name}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase bg-gray-800 px-1 rounded">
                    {msg.sender.role}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm ${
                    msg.isInternal
                      ? "bg-yellow-900/20 border border-yellow-700/50 text-yellow-100"
                      : isMe
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-gray-700 text-gray-200 rounded-tl-none"
                  }`}
                >
                  {msg.isInternal && (
                    <div className="flex items-center gap-1 mb-2 text-yellow-500 text-xs font-bold uppercase tracking-wider border-b border-yellow-500/20 pb-1">
                      <AlertTriangle className="w-3 h-3" /> Internal Note
                    </div>
                  )}
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {canAddMessage && (
        <div className="relative bg-[#0F172A] rounded-xl border border-gray-700 p-2">
          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder={isInternal ? "Internal note..." : "Message to user..."}
            className={`w-full bg-transparent text-sm text-white focus:outline-none p-2 h-20 resize-none ${isInternal ? "text-yellow-200" : ""}`}
          />
          <div className="flex justify-between items-center px-2 pb-1">
            <button
              onClick={() => setIsInternal(!isInternal)}
              className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${isInternal ? "bg-yellow-500 text-black font-bold" : "text-gray-500 hover:text-gray-300"}`}
            >
              {isInternal ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              {isInternal ? "Internal ON" : "Internal?"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending || !replyMessage.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}{" "}
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
