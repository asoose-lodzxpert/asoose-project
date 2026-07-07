import React, { useState } from 'react';
import { ShieldCheck, Smartphone, Mail, AlertTriangle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';

// 1. SCAPPER-COMPATIBLE METADATA (Next.js App Router)
// This ensures Google Play's automated bots immediately read the page intent
// before any JavaScript executes, preventing 404s or "missing policy" rejections.
export const metadata = {
  title: 'Data Deletion Request | ASOOSE Vendor',
  description: 'Submit a request to delete your ASOOSE Vendor account and associated personal data. Review our data retention and deletion policies.',
  robots: 'index, follow',
};

export default function DeleteDataPage() {
  // Simulate fullstack form handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call to your backend
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 py-6 px-6 sm:px-12">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold tracking-tight">ASOOSE Vendor</span>
          </div>
          <nav className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <a href="/privacy">Privacy Policy</a>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">

        {/* Left Column: Instructions & Policies */}
        <div className="lg:col-span-7 space-y-10">
          <section>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
              Data Deletion & Account Closure
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              We respect your privacy. As an ASOOSE Vendor, you have the right to request the complete deletion of your account and personal data from our systems, in compliance with GDPR and Google Play Data Safety guidelines.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-semibold border-b border-slate-200 pb-2">
              How to Request Deletion
            </h2>

            {/* Method 1: In-App */}
            <div className="flex gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex-shrink-0 bg-blue-50 p-3 rounded-lg">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Method 1: Inside the ASOOSE App (Fastest)</h3>
                <p className="text-sm text-slate-600 mt-1 mb-3">
                  You can delete your account instantly from within the mobile application.
                </p>
                <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 text-xs font-mono px-3 py-2 rounded-md">
                  Settings <span className="text-slate-400">→</span> Account <span className="text-slate-400">→</span> Delete Account
                </div>
              </div>
            </div>

            {/* Method 2: Email */}
            <div className="flex gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex-shrink-0 bg-slate-50 p-3 rounded-lg">
                <Mail className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Method 2: Via Email</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Send an email from your registered email address requesting account deletion. Please include your <strong>Vendor ID</strong>.
                </p>
                <a
                  href="mailto:hello@asoose.com?subject=Account%20Deletion%20Request"
                  className="inline-flex mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 underline underline-offset-4"
                >
                  hello@asoose.com
                </a>
              </div>
            </div>
          </section>

          <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="text-sm space-y-2">
                <h4 className="font-semibold text-amber-800">What happens to your data?</h4>
                <p>Upon processing your request, we will permanently delete your profile, inventory history, and personal identifiers.</p>
                <p className="text-amber-700/80 text-xs mt-2">
                  *Note: Financial transaction records may be retained for up to 7 years to comply with local tax and anti-money laundering (AML) regulations.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Web Form */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8 sticky top-8">
            {isSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Request Submitted</h3>
                <p className="text-sm text-slate-600">
                  We have received your deletion request. Our team will process this within 30 days and confirm via email.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    Submit Web Request
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Fill out this form if you no longer have access to the app.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                      Registered Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      placeholder="vendor@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="vendorId" className="block text-sm font-medium text-slate-700 mb-1">
                      Vendor ID (Optional)
                    </label>
                    <input
                      type="text"
                      id="vendorId"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      placeholder="e.g. VEND-12345"
                    />
                  </div>

                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-1">
                      Reason for deletion (Optional)
                    </label>
                    <textarea
                      id="reason"
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm resize-none"
                      placeholder="Let us know how we can improve..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Request Data Deletion'
                    )}
                  </button>
                  <p className="text-xs text-center text-slate-500 mt-3">
                    By submitting this form, you authorize us to permanently delete your account data.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} ASOOSE. All rights reserved.</p>
        <div className="mt-2 space-x-4">
          <a href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</a>
          <a href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
        </div>
      </footer>
    </main>
  );
}