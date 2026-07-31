import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Your Asoose Account",
  description:
    "Instructions for requesting deletion of your Asoose customer account and associated data.",
};

export default function DeleteDataPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Data Deletion Request
        </h1>

        <p className="mt-4 text-sm text-muted-foreground">
          The Asoose customer app allows you to request deletion of your
          account and the personal data associated with it.
        </p>

        <div className="mt-6 space-y-3 text-sm">
          <p>
            <span className="font-medium">Option 1:</span> Open the Asoose
            customer app and navigate to:
          </p>

          <p className="rounded-lg bg-muted px-4 py-2 font-mono text-xs">
            Settings → Account → Delete Account
          </p>

          <p>
            <span className="font-medium">Option 2:</span> If you cannot access
            the app, email us at:
          </p>

          <a
            href="mailto:hello@asoose.com"
            className="inline-block font-medium text-primary underline-offset-4 hover:underline"
          >
            hello@asoose.com
          </a>

          <p className="text-muted-foreground">
            Please include your registered email address or phone number. We
            may ask you to verify account ownership. Deletion requests are
            processed within 30 days.
          </p>

          <p className="text-muted-foreground">
            Account data is deleted or de-identified, except for limited records
            that must be retained for security, fraud prevention, unresolved
            disputes, or legal, tax, and regulatory obligations. Protected
            backup copies may remain temporarily until overwritten under our
            backup cycle.
          </p>

          <Link
            href="/privacy-policy#deletion"
            className="inline-block font-medium text-primary underline-offset-4 hover:underline"
          >
            Read our account deletion policy
          </Link>
        </div>

        <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} ASOOSE. All rights reserved.
        </div>
      </div>
    </main>
  );
}
