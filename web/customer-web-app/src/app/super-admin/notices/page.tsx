"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import { getSession } from "next-auth/react";
import {
  Megaphone,
  Send,
  Mail,
  Loader2,
  RadioTower,
  User,
  ChevronDown,
} from "lucide-react";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

type EntityType = "USER" | "RIDER" | "DRIVER" | "VENDOR";
type Channel = "push" | "email" | "both";

async function apiFetch(path: string, method: string, body: object) {
  const session = await getSession();
  const token = (session as any)?.accessToken;
  if (!token) throw new Error("Authentication required");

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Request failed");
  return data;
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-300 mb-1">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-[#0F172A] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-colors ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none bg-[#0F172A] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-colors ${props.className ?? ""}`}
      />
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-[#0F172A] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-colors resize-y ${props.className ?? ""}`}
    />
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1E293B] rounded-2xl border border-gray-800 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-yellow-500" />
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

// ─── Section 1: Send a notice to a single entity ─────────────────────────────

function SingleEntityForm() {
  const [entityType, setEntityType] = useState<EntityType>("USER");
  const [entityId, setEntityId] = useState("");
  const [channel, setChannel] = useState<Channel>("both");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId.trim()) return toast.error("Entity ID is required");
    if (!title.trim() || !message.trim())
      return toast.error("Title and message are required");

    setLoading(true);
    try {
      const res = await apiFetch("/super-admin/notices/send", "POST", {
        entityType,
        entityId: entityId.trim(),
        channels: channel,
        title,
        message,
      });
      toast.success(
        `Notice sent! Push: ${res.pushSent ? "✓" : "–"}  Email: ${res.emailQueued ? "✓" : "–"}`,
      );
      setEntityId("");
      setTitle("");
      setMessage("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send notice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Send to a Single Entity" icon={User}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Entity Type</Label>
            <Select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
            >
              <option value="USER">Customer / User</option>
              <option value="RIDER">Rider</option>
              <option value="DRIVER">Driver</option>
              <option value="VENDOR">Vendor</option>
            </Select>
          </div>
          <div>
            <Label>Channel</Label>
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
            >
              <option value="both">Push + Email</option>
              <option value="push">Push only</option>
              <option value="email">Email only</option>
            </Select>
          </div>
        </div>

        <div>
          <Label>Entity ID</Label>
          <Input
            placeholder="Paste the user / rider / vendor ID here"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
          />
        </div>

        <div>
          <Label>Title</Label>
          <Input
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <Label>Message</Label>
          <Textarea
            rows={4}
            placeholder="Write your message here…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-2">
          <SubmitButton loading={loading}>
            <Send className="w-4 h-4" />
            Send Notice
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

// ─── Section 2: Broadcast to all of a type ───────────────────────────────────

function BroadcastForm() {
  const [entityType, setEntityType] = useState<EntityType | "ALL">("ALL");
  const [channel, setChannel] = useState<Channel>("both");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim())
      return toast.error("Title and message are required");

    const confirmed = window.confirm(
      `Broadcast "${title}" to ALL ${entityType === "ALL" ? "users, riders, drivers and vendors" : entityType.toLowerCase() + "s"} via ${channel}?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await apiFetch("/super-admin/notices/broadcast", "POST", {
        entityType: entityType === "ALL" ? undefined : entityType,
        channels: channel,
        title,
        message,
      });
      toast.success(
        `Broadcast queued! Push: ${res.pushCount ?? 0}  Emails: ${res.emailCount ?? 0}`,
      );
      setTitle("");
      setMessage("");
    } catch (err: any) {
      toast.error(err.message ?? "Broadcast failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Broadcast to a Group" icon={RadioTower}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Recipient Type</Label>
            <Select
              value={entityType}
              onChange={(e) =>
                setEntityType(e.target.value as EntityType | "ALL")
              }
            >
              <option value="ALL">Everyone (all types)</option>
              <option value="USER">Customers only</option>
              <option value="RIDER">Riders only</option>
              <option value="DRIVER">Drivers only</option>
              <option value="VENDOR">Vendors only</option>
            </Select>
          </div>
          <div>
            <Label>Channel</Label>
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value as Channel)}
            >
              <option value="both">Push + Email</option>
              <option value="push">Push only</option>
              <option value="email">Email only</option>
            </Select>
          </div>
        </div>

        <div>
          <Label>Title</Label>
          <Input
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <Label>Message</Label>
          <Textarea
            rows={4}
            placeholder="Write your broadcast message here…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-2">
          <SubmitButton loading={loading}>
            <Megaphone className="w-4 h-4" />
            Send Broadcast
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

// ─── Section 3: Marketing email template ─────────────────────────────────────

function MarketingEmailForm() {
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [recipientTypes, setRecipientTypes] = useState<EntityType[]>([
    "USER",
    "RIDER",
    "DRIVER",
    "VENDOR",
  ]);
  const [loading, setLoading] = useState(false);

  const toggleType = (type: EntityType) => {
    setRecipientTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setHtmlContent((ev.target?.result as string) ?? "");
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return toast.error("Email subject is required");
    if (!htmlContent.trim()) return toast.error("HTML content is required");
    if (recipientTypes.length === 0)
      return toast.error("Select at least one recipient type");

    const confirmed = window.confirm(
      `Send marketing email "${subject}" to ${recipientTypes.join(", ")}?\n\nThis will queue emails for ALL matching accounts.`,
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await apiFetch(
        "/super-admin/notices/marketing-email",
        "POST",
        {
          subject,
          htmlContent,
          recipientTypes,
        },
      );
      toast.success(`Marketing email queued for ${res.queued} recipient(s)`);
      setSubject("");
      setHtmlContent("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send marketing email");
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: { type: EntityType; label: string }[] = [
    { type: "USER", label: "Customers" },
    { type: "RIDER", label: "Riders" },
    { type: "DRIVER", label: "Drivers" },
    { type: "VENDOR", label: "Vendors" },
  ];

  return (
    <Card title="Marketing Email Broadcast" icon={Mail}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Send to</Label>
          <div className="flex flex-wrap gap-3 mt-1">
            {typeLabels.map(({ type, label }) => {
              const checked = recipientTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    checked
                      ? "bg-yellow-500 text-black border-yellow-500"
                      : "bg-transparent text-gray-400 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Subject Line</Label>
          <Input
            placeholder="e.g. Big Summer Sale 🎉"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div>
          <Label>Upload HTML template (.html file)</Label>
          <input
            type="file"
            accept=".html,.htm"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yellow-500/10 file:text-yellow-400 hover:file:bg-yellow-500/20 cursor-pointer"
          />
        </div>

        <div>
          <Label>
            Or paste / edit HTML directly{" "}
            <span className="text-gray-500 text-xs font-normal">
              (use {"{name}"} for personalisation)
            </span>
          </Label>
          <Textarea
            rows={10}
            placeholder="<h1>Hello {name}!</h1><p>Check out our latest deals...</p>"
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        {htmlContent && (
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-400 hover:text-white transition-colors">
              Preview rendered HTML ▸
            </summary>
            <div
              className="mt-3 p-4 bg-white rounded-xl text-black text-sm overflow-auto max-h-96"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </details>
        )}

        <div className="flex justify-end pt-2">
          <SubmitButton loading={loading}>
            <Mail className="w-4 h-4" />
            Send Marketing Email
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NoticesPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
          <Megaphone className="w-6 h-6 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Notices</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Send push notifications and emails to platform users
          </p>
        </div>
      </div>

      {/* Single entity */}
      <SingleEntityForm />

      {/* Broadcast */}
      <BroadcastForm />

      {/* Marketing email */}
      <MarketingEmailForm />
    </div>
  );
}
