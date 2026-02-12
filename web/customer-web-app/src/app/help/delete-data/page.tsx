export default function DeleteDataPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Data Deletion Request
        </h1>

        <p className="mt-4 text-sm text-muted-foreground">
          ASOOSE Vendor App allows users to request deletion of their personal
          data associated with their account.
        </p>

        <div className="mt-6 space-y-3 text-sm">
          <p>
            <span className="font-medium">Option 1:</span> Open the ASOOSE
            Vendor App and navigate to:
          </p>

          <p className="rounded-lg bg-muted px-4 py-2 font-mono text-xs">
            Settings → Account → Delete Account
          </p>

          <p>
            <span className="font-medium">Option 2:</span> If you cannot access
            the app, email us at:
          </p>

          <a
            href="mailto:support@asoose.com"
            className="inline-block font-medium text-primary underline-offset-4 hover:underline"
          >
            hello@asoose.com
          </a>

          <p className="text-muted-foreground">
            Please include your registered email address and vendor ID. Data
            deletion requests are processed within 30 days.
          </p>
        </div>

        <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} ASOOSE. All rights reserved.
        </div>
      </div>
    </main>
  );
}
