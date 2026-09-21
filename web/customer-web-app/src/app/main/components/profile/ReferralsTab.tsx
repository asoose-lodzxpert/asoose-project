"use client";

import { useEffect, useState } from "react";
import { Copy, Gift, Share2 } from "lucide-react";
import { ApiService } from "@/services/api.service";

type ReferralSummary = {
  referralCode: string;
  shareMessage: string;
  invited: number;
  pending: number;
  credited: number;
  totalEarned: number;
};

export function ReferralsTab({ token, compact = false }: { token: string; compact?: boolean }) {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setSummary(null);
    setError("");
    ApiService.get<ReferralSummary>("/referrals/me", token).then((data) => {
      if (active) setSummary(data);
    }).catch((cause) => {
      if (active) setError(cause?.message || "Couldn’t load your referrals. Please try again.");
    });
    return () => { active = false; };
  }, [token, attempt]);

  async function share(copyCode = false) {
    if (!summary) return;
    setNotice("");
    const url = new URL("/sign-up", window.location.origin);
    url.searchParams.set("referralCode", summary.referralCode);
    try {
      if (!copyCode && navigator.share) {
        await navigator.share({ title: "Join me on Asoose", text: summary.shareMessage, url: url.toString() });
      } else {
        await navigator.clipboard.writeText(copyCode ? summary.referralCode : `${summary.shareMessage}\n${url}`);
        setNotice(copyCode ? "Referral code copied." : "Invitation copied. Share it with a friend!");
      }
    } catch (cause) {
      if ((cause as Error).name !== "AbortError") setNotice("Couldn’t share automatically. You can select and copy your code below.");
    }
  }

  if (error) return <div role="alert" className="rounded-2xl border border-red-200 p-6 text-sm">{error}<button onClick={() => setAttempt(attempt + 1)} className="ml-3 font-bold underline">Try again</button></div>;
  if (!summary) return <div role="status" className="animate-pulse rounded-3xl bg-gray-100 p-8 text-sm text-gray-500 dark:bg-white/5">Loading your referrals…</div>;

  return (
    <section className="space-y-5" aria-labelledby="referrals-heading">
      <div className={`overflow-hidden rounded-3xl bg-[#181816] text-white ${compact ? "px-5 py-4" : "p-6 sm:p-8"}`}>
        {!compact && <>
        <span className="inline-flex rounded-2xl bg-yellow-400/15 p-3 text-yellow-400"><Gift className="h-6 w-6" /></span>
        <h2 id="referrals-heading" className="mt-5 text-2xl font-bold tracking-tight">Good things are better shared.</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-white/60">Invite friends to Asoose with your personal code and keep track of your referral rewards here.</p>
        </>}
        {compact && <h2 id="referrals-heading" className="sr-only">Your referral code</h2>}
        <div className={`flex flex-wrap items-center justify-between gap-4 ${compact ? "" : "mt-6"}`}>
          <div className="flex items-center gap-5 rounded-2xl border border-dashed border-white/25 bg-white/5 px-5 py-4">
            <div><p className="text-xs text-white/60">Your referral code</p><p className="mt-1 select-all font-mono text-2xl font-bold tracking-[0.2em] text-yellow-400">{summary.referralCode}</p></div>
            <button onClick={() => share(true)} aria-label="Copy referral code" className="rounded-lg p-2 hover:bg-white/10"><Copy className="h-5 w-5" /></button>
          </div>
          <button onClick={() => share()} className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black hover:bg-yellow-300"><Share2 className="h-4 w-4" />Invite a friend</button>
        </div>
        <p role="status" className={notice ? "mt-3 text-sm text-yellow-300" : "sr-only"}>{notice}</p>
      </div>
      {!compact && <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Invited", summary.invited], ["Pending", summary.pending], ["Credited", summary.credited],
          ["Total earned", new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(summary.totalEarned)],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-white/5"><p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{value}</p></div>)}
      </div>
      {summary.invited === 0 && <p className="px-1 text-sm text-gray-500">Your first invitation starts here. Share your code with a friend to get started.</p>}
      </>}
    </section>
  );
}
