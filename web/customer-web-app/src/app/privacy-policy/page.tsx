import type { Metadata } from "next";
import PrivacyLayout from "./components/PrivacyLayout";
import { 
  Shield, 
  Eye, 
  Users, 
  Lock, 
  MapPin, 
  AlertTriangle, 
  UserPlus,
  Globe
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Asoose Technologies",
  description:
    "Privacy Policy for Asoose - Learn how we collect, use, and protect your data across our Customer, Rider, and Vendor applications.",
};

const sections = [
  { id: "intro", title: "Introduction", icon: <Shield size={18}/> },
  { id: "collection", title: "Information We Collect", icon: <Eye size={18}/> },
  { id: "usage", title: "How We Use Information", icon: <Users size={18}/> },
  { id: "sharing", title: "Information Sharing", icon: <Lock size={18}/> },
  { id: "security", title: "Data Security", icon: <Lock size={18}/> },
  { id: "location", title: "Location & Push", icon: <MapPin size={18}/> },
  { id: "rights", title: "Your Rights & Choices", icon: <UserPlus size={18}/> },
  { id: "prohibited", title: "Prohibited Content", icon: <AlertTriangle size={18}/> },
];

export default function PrivacyPolicyPage() {
  return (
    <PrivacyLayout sections={sections}>
      <header className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-zinc-900 dark:text-white mb-6 tracking-tight">
          Privacy Policy
        </h1>
        <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest opacity-40">
          <span>Last Updated: April 4, 2026</span>
          <span className="hidden sm:inline">•</span>
          <span>Effective Date: April 4, 2026</span>
        </div>
      </header>

      {/* --- Introduction --- */}
      <section id="intro" className="scroll-mt-24 mb-16">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight">
          1. Introduction
        </h2>
        <div className="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
          <p>
            Welcome to the <strong>Asoose Platform</strong> (&quot;Platform&quot;).
            This privacy policy explains how <strong>Asoose Technologies Inc.</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) 
            collects, uses, stores, and protects your information across our ecosystem, including our Customer, Rider, and Vendor mobile applications and websites.
          </p>
          <p>
            Asoose connects you with a hyper-local marketplace for rides, food delivery, logistics, and retail. 
            By accessing or using any part of the Platform, you agree to the collection and use of information in accordance with this policy. 
            If you do not agree, please do not use our services.
          </p>
        </div>
      </section>

      {/* --- Information We Collect --- */}
      <section id="collection" className="scroll-mt-24 mb-16">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight">
          2. Information We Collect
        </h2>
        <div className="space-y-6 text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
          <div>
            <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-200 mb-3 tracking-wide uppercase text-xs opacity-60">
              2.1 Account & Profile Information
            </h3>
            <p className="mb-4">
              We collect information you provide directly when creating or updating your account:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none p-0">
              <li className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <strong className="block text-zinc-900 dark:text-white mb-1">Personal Identifiers</strong>
                Name, email address, phone number, and password (encrypted).
              </li>
              <li className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <strong className="block text-zinc-900 dark:text-white mb-1">Business Data (Vendors)</strong>
                Store name, legal business registration, tax IDs, and bank payout details.
              </li>
              <li className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <strong className="block text-zinc-900 dark:text-white mb-1">Rider Verification</strong>
                Driver&apos;s license, vehicle registration, and identity documents for background checks.
              </li>
              <li className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <strong className="block text-zinc-900 dark:text-white mb-1">Saved Addresses</strong>
                Home, work, and other custom delivery or pickup locations.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-200 mb-3 tracking-wide uppercase text-xs opacity-60">
              2.2 Transaction & Usage Data
            </h3>
            <p>
              We collect details related to your orders, rides, and logistics requests:
            </p>
            <ul className="list-disc ml-6 space-y-2">
              <li><strong>Order History:</strong> Items purchased, total amounts, and delivery instructions.</li>
              <li><strong>Payment Info:</strong> We use secure PCI-compliant processors; we do not store full card numbers on our servers.</li>
              <li><strong>App Usage:</strong> Features used, interaction time, and crash reports.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* --- How We Use Information --- */}
      <section id="usage" className="scroll-mt-24 mb-16">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight">
          3. How We Use Information
        </h2>
        <div className="space-y-4 text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
          <p>We process your data to fulfill our services and ensure safety:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl">
              <h4 className="font-black text-zinc-900 dark:text-white mb-2 uppercase text-xs tracking-widest">Service Delivery</h4>
              <p className="text-sm">Connecting Customers with Vendors and Riders for seamless transactions and real-time tracking.</p>
            </div>
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl">
              <h4 className="font-black text-zinc-900 dark:text-white mb-2 uppercase text-xs tracking-widest">Trust & Safety</h4>
              <p className="text-sm">Verifying Rider identities, moderating Vendor listings, and preventing fraudulent behaviors.</p>
            </div>
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl">
              <h4 className="font-black text-zinc-900 dark:text-white mb-2 uppercase text-xs tracking-widest">Support</h4>
              <p className="text-sm">Resolving order disputes, providing assistance, and managing account-related inquiries.</p>
            </div>
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl">
              <h4 className="font-black text-zinc-900 dark:text-white mb-2 uppercase text-xs tracking-widest">Optimization</h4>
              <p className="text-sm">Analyzing usage patterns to improve app performance and personalize your marketplace experience.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Information Sharing --- */}
      <section id="sharing" className="scroll-mt-24 mb-16">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight">
          4. Information Sharing
        </h2>
        <div className="space-y-4 text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
          <p><strong>We do not sell your personal data.</strong> Sharing only occurs for operational necessity:</p>
          <div className="space-y-4">
            <div className="flex gap-4 p-5 rounded-2xl border border-gray-100 dark:border-white/5">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                <Users className="text-yellow-500 w-5 h-5" />
              </div>
              <div>
                <strong className="text-zinc-900 dark:text-white text-sm">Among Users</strong>
                <p className="text-xs mt-1">Riders see customer names and drop-off points. Vendors see order lists and delivery instructions.</p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-2xl border border-gray-100 dark:border-white/5">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Globe className="text-blue-500 w-5 h-5" />
              </div>
              <div>
                <strong className="text-zinc-900 dark:text-white text-sm">Service Providers</strong>
                <p className="text-xs mt-1">We share data with trusted infrastructure partners like Expo (notifications) and our cloud hosting providers.</p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-2xl border border-gray-100 dark:border-white/5">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Lock className="text-red-500 w-5 h-5" />
              </div>
              <div>
                <strong className="text-zinc-900 dark:text-white text-sm">Legal Requirement</strong>
                <p className="text-xs mt-1">Disclosure when required by court orders, subpoenas, or to prevent immediate harm to our community.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Data Security --- */}
      <section id="security" className="scroll-mt-24 mb-16">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight">
          5. Data Security
        </h2>
        <div className="space-y-4 text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
          <p>We implement bank-grade security to protect your information:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Encryption:</strong> Data is encrypted in transit (HTTPS/TLS) and at rest in our databases.</li>
            <li><strong>Access Control:</strong> Internal access to user data is strictly limited to authorized personnel with logged sessions.</li>
            <li><strong>Retention:</strong> We store data as long as your account is active or as required by Nigerian law for tax compliance.</li>
          </ul>
        </div>
      </section>

      {/* --- Location & Push --- */}
      <section id="location" className="scroll-mt-24 mb-16">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight">
          6. Location & Notifications
        </h2>
        <div className="space-y-6 text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
          <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-3xl">
            <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-200 mb-3 tracking-wide uppercase text-xs">
              6.1 Critical Location Tracking
            </h3>
            <p className="mb-4 text-sm">
              Different apps use location data for specific core functions:
            </p>
            <ul className="space-y-3 list-none p-0 text-sm">
              <li className="flex gap-3">
                <span className="text-yellow-500 font-bold shrink-0">Riders:</span>
                We collect real-time background location to dispatch nearby jobs and allow customers to track their ride or food.
              </li>
              <li className="flex gap-3">
                <span className="text-yellow-500 font-bold shrink-0">Customers:</span>
                We use location to suggest nearby stores and calculate pinpoint delivery drop-offs.
              </li>
              <li className="flex gap-3">
                <span className="text-yellow-500 font-bold shrink-0">Vendors:</span>
                We record the static business location to enable store discovery and delivery fee calculations.
              </li>
            </ul>
          </div>

          <div>
             <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-200 mb-3 tracking-wide uppercase text-xs">
              6.2 Push Notifications
            </h3>
            <p>
              We use push tokens to alert you of incoming jobs, order status updates, and account security alerts. 
              You can opt-out of marketing alerts in settings, but transactional notifications are required for service usability.
            </p>
          </div>
        </div>
      </section>

      {/* --- Your Rights --- */}
      <section id="rights" className="scroll-mt-24 mb-16">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight">
          7. Your Rights & Choices
        </h2>
        <div className="space-y-4 text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
          <p>You maintain control over your data destiny:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Access & Update:</strong> Modify your profile settings directly within any Asoose app.</li>
            <li><strong>Retention Policy:</strong> We retain data as long as your account is active or needed for legal compliance.</li>
            <li><strong>Full Deletion:</strong> You can request account deletion via App Settings. Requests are typically processed within 2-5 business days.</li>
            <li><strong>Opt-Out:</strong> Manage notification permissions and marketing preferences in device settings.</li>
          </ul>
        </div>
      </section>

      {/* --- Prohibited Content --- */}
      <section id="prohibited" className="scroll-mt-24 mb-16">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight">
          8. Prohibited Content & Behavior
        </h2>
        <div className="p-8 bg-red-50 dark:bg-red-950/20 rounded-3xl border border-red-100 dark:border-red-900/30">
          <p className="text-red-900 dark:text-red-400 font-bold mb-4">
            To ensure community safety, the following are strictly prohibited on the Platform:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-red-800/80 dark:text-red-400/80">
            <ul className="list-disc ml-6 space-y-1">
              <li>Illegal drugs and narcotics</li>
              <li>Unauthorized weapons or firearms</li>
              <li>Adult content or pornography</li>
              <li>Alcohol & Tobacco (unlicensed)</li>
            </ul>
            <ul className="list-disc ml-6 space-y-1">
              <li>Counterfeit or stolen goods</li>
              <li>Endangered wildlife products</li>
              <li>Toxic chemicals or hazardous waste</li>
              <li>Hate speech or discriminatory content</li>
            </ul>
          </div>
          <p className="mt-6 text-xs italic opacity-60">
            Violation results in immediate permanent ban and potential legal reporting.
          </p>
        </div>
      </section>

      <div className="mt-12 p-8 bg-zinc-900 text-white rounded-3xl text-center">
        <h3 className="text-xl font-black mb-2">Questions?</h3>
        <p className="opacity-60 text-sm mb-6 max-w-sm mx-auto">Our legal team is here to help you understand your data rights.</p>
        <a href="mailto:legal@asoose.com" className="text-yellow-500 font-black tracking-widest uppercase text-xs hover:underline">
          legal@asoose.com
        </a>
      </div>
    </PrivacyLayout>
  );
}
