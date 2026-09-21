"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ApiService } from "@/services/api.service";

type PhoneProfile = { phone: string | null; phoneVerified?: boolean };

export function PhoneNumberPrompt() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const token = status === "authenticated" ? session?.accessToken : undefined;
  // Remount when the account changes so pending requests cannot affect another user.
  return token ? <PhoneForm key={token} token={token} pathname={pathname} /> : null;
}

function PhoneForm({ token, pathname }: { token: string; pathname: string }) {
  const [missing, setMissing] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setCheckError(false);
    ApiService.get<PhoneProfile>("/users/me", token).then((profile) => {
      if (active) setMissing(!profile.phone?.trim());
    }).catch(() => {
      if (active) setCheckError(true);
    });
    return () => { active = false; };
  }, [token, pathname, attempt]);

  if (checkError) return (
    <div className="mx-auto w-full max-w-5xl p-4 text-sm" role="status">
      We couldn’t check your phone number. <button className="underline" onClick={() => setAttempt(attempt + 1)}>Try again</button>
    </div>
  );
  if (!missing) return null;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const profile = await ApiService.patch<PhoneProfile>("/users/me/profile", {
        phone: phone.trim(),
        phoneCountryCode: "+234",
      }, token);
      if (!profile.phone?.trim()) throw new Error("Your phone number wasn’t saved. Please try again.");
      setMissing(false);
    } catch (cause) {
      setError((cause as { message?: string })?.message || "Couldn’t save your phone number. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="phone-prompt-title" className="mx-auto w-full max-w-5xl p-4">
      <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-4 sm:p-5">
        <h2 id="phone-prompt-title" className="font-bold">Add your phone number</h2>
        <p className="mt-1 text-sm">Save a number so we can contact you about your orders and bookings.</p>
        <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">Phone number
            <input aria-label="Phone number" type="tel" autoComplete="tel-national" required pattern="[0-9]{6,14}" placeholder="08012345678" title="Enter 6 to 14 digits without the country code" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} className="mt-1 block w-full rounded-lg border p-2 text-black" />
          </label>
          <button disabled={saving} className="rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-50">{saving ? "Saving…" : "Save phone number"}</button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </section>
  );
}
