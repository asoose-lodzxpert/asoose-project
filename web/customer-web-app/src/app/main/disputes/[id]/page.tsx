"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  MessageCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { getSession } from "next-auth/react"; // ✅ Import NextAuth

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function DisputeDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDispute = async () => {
      // ✅ Get Session via NextAuth
      const session = await getSession();
      const token = (session as any)?.accessToken;

      try {
        const res = await fetch(`${API_URL}/super-admin/disputes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }, // ✅ Use Token
        });

        if (!res.ok) throw new Error("Dispute not found");
        setDispute(await res.json());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchDispute();
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-500" />
      </div>
    );
  if (!dispute)
    return <div className="p-8 text-center font-bold">Dispute not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-white dark:bg-[#151515] border-b dark:border-white/5 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black tracking-tight italic">
          Dispute #{dispute.id.slice(0, 8).toUpperCase()}
        </h1>
      </div>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Status Card */}
        <div className="bg-white dark:bg-[#151515] p-6 rounded-[2.5rem] shadow-sm border dark:border-white/5 text-center">
          <div
            className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${
              dispute.status === "RESOLVED" ? "bg-green-500" : "bg-blue-500"
            }`}
          >
            {dispute.status === "RESOLVED" ? (
              <ShieldCheck className="text-white w-8 h-8" />
            ) : (
              <Clock className="text-white w-8 h-8" />
            )}
          </div>
          <h2 className="text-xl font-black mb-1">{dispute.status}</h2>
          <p className="text-sm text-gray-500 font-medium italic">
            Priority: {dispute.priority}
          </p>
        </div>

        {/* Claim Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">
            Claim Details
          </h3>
          <div className="bg-white dark:bg-[#151515] p-6 rounded-[2.5rem] border dark:border-white/5 space-y-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase">
                Reason
              </p>
              <p className="font-bold text-sm">{dispute.reason}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase">
                Your Description
              </p>
              <p className="text-sm opacity-80 leading-relaxed">
                {dispute.description}
              </p>
            </div>
          </div>
        </div>

        {/* Evidence Photos */}
        {dispute.evidenceImages?.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">
              Attached Evidence
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {dispute.evidenceImages.map((img: string, idx: number) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-3xl overflow-hidden border dark:border-white/5"
                >
                  <Image
                    src={img}
                    alt="Evidence"
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolution Notes (If Resolved) */}
        {dispute.resolutionNotes && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
            <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest ml-2">
              Support Team Update
            </h3>
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-[2.5rem]">
              <div className="flex gap-3 mb-2">
                <MessageCircle className="w-5 h-5 text-yellow-600" />
                <p className="text-sm font-black text-yellow-700 dark:text-yellow-500">
                  Official Resolution
                </p>
              </div>
              <p className="text-sm text-yellow-800 dark:text-yellow-500/90 leading-relaxed">
                {dispute.resolutionNotes}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
