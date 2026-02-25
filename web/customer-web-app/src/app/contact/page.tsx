"use client";

import { useTheme } from "next-themes";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function ContactPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "General Support",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({
    type: null,
    message: "",
  });

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  const darkMode = resolvedTheme === "dark";

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: "" });

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
      const response = await fetch(`${apiUrl}/support/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to send message");

      setStatus({
        type: "success",
        message: "Message sent! Our team will get back to you soon.",
      });
      setFormData({
        name: "",
        email: "",
        subject: "General Support",
        message: "",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: "Something went wrong. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main
        className={`flex-grow pt-20 ${darkMode ? "bg-[#0a0a0a] text-white" : "bg-white text-black"}`}
      >
        <section className="py-20 px-6 max-w-4xl mx-auto">
          <div className="space-y-16">
            <div>
              <h1 className="text-4xl font-bold mb-4">Get in touch</h1>
              <p className="opacity-60">
                Have questions? Our team is here to help.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <ContactInfo
                icon={<Mail />}
                label="Email"
                value="support@asoose.com"
                href="mailto:support@asoose.com"
              />
              <ContactInfo
                icon={<Phone />}
                label="Phone"
                value="+234 (0) 8061966145"
                href="tel:+2348061966145"
              />
              <div className="flex gap-4 items-start">
                <MapPin className="text-yellow-500 shrink-0" size={20} />
                <div>
                  <div className="text-sm opacity-60">Address</div>
                  <div className="text-sm">
                    Suite B17 Musty Global Plaza, Old GRA, Maiduguri
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`p-8 rounded-lg border ${darkMode ? "border-white/10" : "border-black/10"}`}
            >
              <h3 className="text-xl font-bold mb-6">Send a message</h3>

              {status.type && (
                <div
                  className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                    status.type === "success"
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {status.type === "success" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                  <span className="text-sm font-medium">{status.message}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs opacity-60 block mb-2">
                      Name
                    </label>
                    <input
                      required
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      type="text"
                      placeholder="Your name"
                      className={`w-full px-4 py-3 rounded border outline-none focus:border-yellow-500 transition-colors ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs opacity-60 block mb-2">
                      Email
                    </label>
                    <input
                      required
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      type="email"
                      placeholder="Your email address"
                      className={`w-full px-4 py-3 rounded border outline-none focus:border-yellow-500 transition-colors ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs opacity-60 block mb-2">
                    Subject
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded border outline-none focus:border-yellow-500 transition-colors ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
                  >
                    <option>General Support</option>
                    <option>Become a Partner</option>
                    <option>Business Inquiry</option>
                    <option>Report an Issue</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs opacity-60 block mb-2">
                    Message
                  </label>
                  <textarea
                    required
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="How can we help?"
                    className={`w-full px-4 py-3 rounded border outline-none focus:border-yellow-500 resize-none transition-colors ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
                  />
                </div>

                <button
                  disabled={isSubmitting}
                  className="w-full py-3 bg-yellow-400 text-black font-bold rounded hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Send size={18} />
                  )}
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ContactInfo({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div className="flex gap-4 items-center">
      <div className="text-yellow-500">{icon}</div>
      <div>
        <div className="text-sm opacity-60">{label}</div>
        <a
          href={href}
          className="text-yellow-500 hover:underline font-medium break-all"
        >
          {value}
        </a>
      </div>
    </div>
  );
}
