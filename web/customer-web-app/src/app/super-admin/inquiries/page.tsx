"use client";

import React, { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import {
  MessageSquare,
  RefreshCw,
  Send,
  CheckCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { fetcher } from "../hooks/useSuperAdminFetch";

interface InquiryReply {
  id: string;
  adminName: string;
  message: string;
  createdAt: string;
}

interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "UNREAD" | "READ" | "REPLIED";
  replies: InquiryReply[];
  createdAt: string;
}

interface InquiriesResponse {
  items: Inquiry[];
  total: number;
  unreadCount: number;
  page: number;
  pages: number;
}

const STATUS_COLORS: Record<string, string> = {
  UNREAD: "bg-red-500/10 text-red-400 border border-red-500/20",
  READ: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  REPLIED: "bg-green-500/10 text-green-400 border border-green-500/20",
};

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  const token =
    (session as any)?.accessToken || (session?.user as any)?.accessToken;
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

export default function InquiriesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);

  const queryString = new URLSearchParams({
    page: String(page),
    limit: "15",
    ...(statusFilter ? { status: statusFilter } : {}),
  }).toString();

  const { data, isLoading, mutate } = useSWR<InquiriesResponse>(
    `/super-admin/inquiries?${queryString}`,
    fetcher,
    { refreshInterval: 30000 },
  );

  const handleExpand = async (inquiry: Inquiry) => {
    if (expandedId === inquiry.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(inquiry.id);
    if (inquiry.status === "UNREAD") {
      setMarking(inquiry.id);
      try {
        await apiFetch(`/super-admin/inquiries/${inquiry.id}/read`, {
          method: "PATCH",
        });
        await mutate();
        globalMutate("/super-admin/inquiries/unread-count");
      } finally {
        setMarking(null);
      }
    }
  };

  const handleReply = async (inquiry: Inquiry) => {
    const message = replyText[inquiry.id]?.trim();
    if (!message) return;
    setSending(inquiry.id);
    try {
      await apiFetch(`/super-admin/inquiries/${inquiry.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setReplyText((prev) => ({ ...prev, [inquiry.id]: "" }));
      await mutate();
      globalMutate("/super-admin/inquiries/unread-count");
    } catch (e: any) {
      alert("Failed to send reply: " + e.message);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-yellow-500" />
            Inquiries
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Contact form submissions from the Asoose website
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(data?.unreadCount ?? 0) > 0 && (
            <span className="px-3 py-1 rounded-full bg-red-500 text-white text-sm font-bold">
              {data!.unreadCount} unread
            </span>
          )}
          <button
            onClick={() => mutate()}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {["", "UNREAD", "READ", "REPLIED"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? "bg-yellow-500 text-black"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Inquiry List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : !data?.items?.length ? (
        <div className="text-center py-20 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No inquiries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((inquiry) => (
            <div
              key={inquiry.id}
              className={`rounded-xl border transition-all ${
                inquiry.status === "UNREAD"
                  ? "border-yellow-500/30 bg-yellow-500/5"
                  : "border-gray-800 bg-[#1E293B]"
              }`}
            >
              {/* Row header */}
              <div
                className="flex items-start justify-between p-5 cursor-pointer"
                onClick={() => handleExpand(inquiry)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <span className="font-semibold text-white">
                      {inquiry.name}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {inquiry.email}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inquiry.status]}`}
                    >
                      {inquiry.status}
                    </span>
                  </div>
                  <p className="text-sm text-yellow-400 font-medium truncate">
                    {inquiry.subject}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(inquiry.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-2 shrink-0">
                  {marking === inquiry.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                  )}
                  {expandedId === inquiry.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded body */}
              {expandedId === inquiry.id && (
                <div className="px-5 pb-5 border-t border-gray-700/50 pt-4 space-y-4">
                  {/* User message */}
                  <div className="bg-[#0F172A] rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-semibold">
                      Message
                    </p>
                    <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {inquiry.message}
                    </p>
                  </div>

                  {/* Previous replies */}
                  {inquiry.replies.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                        Replies
                      </p>
                      {inquiry.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="bg-green-500/5 border border-green-500/20 rounded-lg p-4"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCheck className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-xs font-semibold">
                              {reply.adminName}
                            </span>
                            <span className="text-gray-500 text-xs ml-auto">
                              {new Date(reply.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                            {reply.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply form */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                      Send a Reply
                    </p>
                    <textarea
                      rows={4}
                      value={replyText[inquiry.id] || ""}
                      onChange={(e) =>
                        setReplyText((prev) => ({
                          ...prev,
                          [inquiry.id]: e.target.value,
                        }))
                      }
                      placeholder="Type your reply here..."
                      className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-yellow-500 transition-colors resize-none"
                    />
                    <button
                      disabled={
                        !replyText[inquiry.id]?.trim() || sending === inquiry.id
                      }
                      onClick={() => handleReply(inquiry)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-black font-semibold text-sm rounded-lg hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending === inquiry.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {sending === inquiry.id ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 text-sm"
          >
            Previous
          </button>
          <span className="text-gray-400 text-sm">
            Page {page} of {data.pages}
          </span>
          <button
            disabled={page === data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
