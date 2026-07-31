import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  Database,
  Eye,
  FileText,
  Globe,
  Lock,
  Mail,
  MapPin,
  Shield,
  Trash2,
  UserRoundCheck,
  Users,
} from "lucide-react";
import PrivacyLayout from "./components/PrivacyLayout";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://asoose.com";

export const metadata: Metadata = {
  title: "Privacy Policy | Asoose",
  description:
    "Privacy Policy for the Asoose customer app and website, including the data we collect, why we use it, how we share it, and your choices.",
  alternates: {
    canonical: `${SITE_URL}/privacy-policy`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const sections = [
  { id: "overview", title: "Overview", icon: <Shield size={18} /> },
  { id: "collection", title: "Data We Collect", icon: <Database size={18} /> },
  { id: "use", title: "How We Use Data", icon: <Eye size={18} /> },
  { id: "location", title: "Location Data", icon: <MapPin size={18} /> },
  { id: "sharing", title: "Sharing", icon: <Users size={18} /> },
  { id: "retention", title: "Retention & Security", icon: <Lock size={18} /> },
  { id: "choices", title: "Your Choices", icon: <UserRoundCheck size={18} /> },
  { id: "deletion", title: "Account Deletion", icon: <Trash2 size={18} /> },
  { id: "children", title: "Children's Privacy", icon: <FileText size={18} /> },
  { id: "changes", title: "Policy Changes", icon: <Globe size={18} /> },
  { id: "contact", title: "Contact Us", icon: <Mail size={18} /> },
];

const dataCards = [
  {
    title: "Account and profile data",
    body: "Your name, email address, phone number, encrypted account credentials, profile photo, and saved addresses.",
  },
  {
    title: "Location data",
    body: "Approximate or precise location when you allow it, plus pickup, drop-off, delivery, and saved-address coordinates you enter.",
  },
  {
    title: "Orders, rides, and deliveries",
    body: "Products ordered, vendor, delivery instructions, ride or package details, status history, receipts, and transaction references.",
  },
  {
    title: "Payment information",
    body: "Payment method, amount, status, and processor reference. Card details are handled by our payment processor; Asoose does not store full card numbers.",
  },
  {
    title: "Content and communications",
    body: "Reviews, ratings, support requests, dispute messages, images or documents you choose to upload, and emergency or ride contacts you choose to save.",
  },
  {
    title: "Device and usage data",
    body: "IP address, device and operating-system details, app version, push-notification token, identifiers, logs, feature interactions, and crash or diagnostics data.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PrivacyLayout sections={sections}>
      <header className="mb-14 border-b border-zinc-200 pb-10 dark:border-white/10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
          <Shield size={14} aria-hidden="true" />
          Asoose customer services
        </div>
        <h1 className="mb-5 text-4xl font-black tracking-tight text-zinc-900 sm:text-5xl dark:text-white">
          Privacy Policy
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          This policy explains how Asoose handles information when you use the
          Asoose customer mobile application, customer website, and related
          services.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
          <span>Effective: July 31, 2026</span>
          <span aria-hidden="true">•</span>
          <span>Last updated: July 31, 2026</span>
        </div>
      </header>

      <section id="overview" className="mb-16 scroll-mt-24">
        <h2 className="mb-5 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          1. Overview
        </h2>
        <div className="space-y-4 font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
          <p>
            Asoose Technologies Inc. (&quot;Asoose,&quot; &quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;) provides a marketplace that lets
            customers shop from local vendors, order delivery, send packages,
            and request rides. This Privacy Policy applies to the Asoose
            customer app and customer-facing website (together, the
            &quot;Services&quot;).
          </p>
          <p>
            By using the Services, you acknowledge the practices described in
            this policy. Some features are optional and only collect data after
            you choose to use them or grant device permission.
          </p>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            <strong className="block mb-1">Our commitment</strong>
            We do not sell your personal or sensitive user data. We limit its
            use to providing, protecting, supporting, and improving the Asoose
            Services and to purposes described below.
          </div>
        </div>
      </section>

      <section id="collection" className="mb-16 scroll-mt-24">
        <h2 className="mb-3 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          2. Information we collect
        </h2>
        <p className="mb-7 font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
          We collect information you provide, information created while you use
          the Services, and limited technical information collected
          automatically.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {dataCards.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <h3 className="mb-2 text-sm font-black text-zinc-900 dark:text-white">
                {item.title}
              </h3>
              <p className="text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
                {item.body}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-7 space-y-4 font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
          <p>
            We may also receive information from services you use to sign in,
            such as Google or Apple, subject to your settings with that
            provider. This can include your name, email address, and provider
            account identifier.
          </p>
          <p>
            We do not access your camera, photo library, files, location, or
            notifications unless you use a related feature and grant the
            applicable permission. You can decline optional permissions, though
            the related feature may not work.
          </p>
        </div>
      </section>

      <section id="use" className="mb-16 scroll-mt-24">
        <h2 className="mb-5 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          3. How we use information
        </h2>
        <ul className="ml-6 list-disc space-y-3 font-medium leading-relaxed text-zinc-600 marker:text-amber-500 dark:text-zinc-400">
          <li>Register, authenticate, secure, and manage your account.</li>
          <li>
            Process orders, payments, refunds, rides, package deliveries, and
            other requested transactions.
          </li>
          <li>
            Match you with vendors and riders, calculate distance and pricing,
            provide navigation-related features, and show live service status.
          </li>
          <li>
            Send order, ride, delivery, payment, security, and service
            notifications. Promotional notifications are controlled separately.
          </li>
          <li>
            Provide customer support, investigate disputes, prevent fraud,
            enforce our terms, and protect users and the platform.
          </li>
          <li>
            Maintain, troubleshoot, analyze, and improve the reliability and
            usability of the Services.
          </li>
          <li>
            Comply with legal, tax, accounting, safety, and regulatory
            obligations.
          </li>
        </ul>
      </section>

      <section id="location" className="mb-16 scroll-mt-24">
        <h2 className="mb-5 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          4. Location data
        </h2>
        <div className="rounded-3xl bg-zinc-900 p-7 text-white dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-zinc-950">
              <MapPin size={20} aria-hidden="true" />
            </span>
            <h3 className="text-lg font-black">Used for customer-requested features</h3>
          </div>
          <p className="text-sm font-medium leading-relaxed text-zinc-300">
            With your permission, Asoose collects approximate or precise
            location while you use location-based features. We use it to show
            nearby stores, suggest pickup or delivery addresses, calculate
            fares and delivery fees, request rides, arrange deliveries, and
            display relevant tracking information. The Asoose customer app does
            not request background-location permission.
          </p>
          <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-300">
            You can disable location access in your device or browser settings
            and enter an address manually where that option is available.
          </p>
        </div>
      </section>

      <section id="sharing" className="mb-16 scroll-mt-24">
        <h2 className="mb-5 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          5. When we share information
        </h2>
        <div className="space-y-4 font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
          <p>
            We share only the information reasonably needed for the purposes
            below:
          </p>
          <ul className="ml-6 list-disc space-y-3 marker:text-amber-500">
            <li>
              <strong className="text-zinc-900 dark:text-white">Vendors and riders:</strong>{" "}
              Order or service details, your first name or account name,
              contact information where necessary, pickup and drop-off details,
              and delivery instructions so they can fulfill your request.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-white">Service providers:</strong>{" "}
              Providers that support payments, maps and geocoding, cloud
              hosting, authentication, messaging and push notifications,
              analytics, fraud prevention, and customer support. These
              providers process data for the services they provide to us.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-white">Legal and safety reasons:</strong>{" "}
              Authorities or other parties when required by applicable law,
              legal process, or when reasonably necessary to protect rights,
              safety, users, or the integrity of the Services.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-white">Business transfers:</strong>{" "}
              A successor or participant in a merger, financing, acquisition,
              reorganization, or sale of assets, subject to appropriate
              confidentiality and notice requirements.
            </li>
          </ul>
          <p>
            Some providers may process data in countries other than the one in
            which you live. Where required, we use appropriate safeguards for
            these transfers.
          </p>
        </div>
      </section>

      <section id="retention" className="mb-16 scroll-mt-24">
        <h2 className="mb-5 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          6. Data retention and security
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 p-6 dark:border-white/10">
            <h3 className="mb-3 font-black text-zinc-900 dark:text-white">Retention</h3>
            <p className="text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
              We retain personal data while your account is active and as
              reasonably necessary to provide the Services. After deletion, we
              may retain limited transaction, fraud-prevention, dispute, tax,
              accounting, or legal records where required or permitted by law.
              Residual copies may remain temporarily in protected backups until
              they are overwritten under our backup cycle.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-6 dark:border-white/10">
            <h3 className="mb-3 font-black text-zinc-900 dark:text-white">Security</h3>
            <p className="text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
              We use administrative, technical, and physical safeguards
              designed to protect personal data, including encrypted network
              transmission and access controls. No storage or transmission
              method is completely secure, so we cannot guarantee absolute
              security.
            </p>
          </div>
        </div>
      </section>

      <section id="choices" className="mb-16 scroll-mt-24">
        <h2 className="mb-5 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          7. Your rights and choices
        </h2>
        <div className="space-y-4 font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
          <p>
            Depending on where you live, you may have rights to access,
            correct, receive a copy of, object to or restrict certain use of,
            or delete your personal data. You may update certain profile and
            address information directly in your account.
          </p>
          <ul className="ml-6 list-disc space-y-3 marker:text-amber-500">
            <li>
              Control location, camera, photos, files, and notifications through
              your device or browser settings.
            </li>
            <li>
              Change marketing-notification preferences without disabling
              essential transactional messages.
            </li>
            <li>
              Contact us to request access, correction, export, or deletion.
              We may need to verify your identity before completing a request.
            </li>
          </ul>
        </div>
      </section>

      <section id="deletion" className="mb-16 scroll-mt-24">
        <div className="rounded-3xl border-2 border-amber-400 bg-amber-50 p-7 dark:bg-amber-400/10">
          <div className="mb-4 flex items-center gap-3">
            <Trash2 className="text-amber-700 dark:text-amber-400" size={24} aria-hidden="true" />
            <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
              8. Delete your account and data
            </h2>
          </div>
          <div className="space-y-4 font-medium leading-relaxed text-zinc-700 dark:text-zinc-300">
            <p>
              You can request deletion from the Asoose customer app under
              <strong> Settings → Account → Delete Account</strong>. If you
              cannot access the app, use our public deletion instructions.
            </p>
            <Link
              href="/help/delete-data"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-black text-white no-underline transition hover:bg-zinc-700 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              Open data deletion page
              <Trash2 size={16} aria-hidden="true" />
            </Link>
            <p className="text-sm">
              Deleting your account deletes or de-identifies the personal data
              associated with it, except limited records we must retain for
              security, fraud prevention, unresolved disputes, or legal,
              tax, and regulatory obligations. Deactivation alone does not
              count as deletion.
            </p>
          </div>
        </div>
      </section>

      <section id="children" className="mb-16 scroll-mt-24">
        <h2 className="mb-5 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          9. Children&apos;s privacy
        </h2>
        <p className="font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
          The Services are not directed to children under 18, and we do not
          knowingly collect personal data from children under 18. If you
          believe a child has provided personal data to us, contact us so we
          can review and delete it where appropriate.
        </p>
      </section>

      <section id="changes" className="mb-16 scroll-mt-24">
        <h2 className="mb-5 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
          10. Changes to this policy
        </h2>
        <p className="font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
          We may update this policy as our Services or legal obligations
          change. We will post the revised policy here, update the date above,
          and provide additional notice when required. Your continued use after
          an update is subject to the revised policy.
        </p>
      </section>

      <section id="contact" className="scroll-mt-24">
        <div className="rounded-3xl bg-zinc-900 p-8 text-white">
          <div className="mb-3 flex items-center gap-3">
            <Mail className="text-amber-400" size={24} aria-hidden="true" />
            <h2 className="text-2xl font-black">11. Contact us</h2>
          </div>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-zinc-300">
            For questions, privacy requests, or concerns about this policy,
            contact Asoose Technologies Inc. Please include enough information
            for us to identify your account and understand your request.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="mailto:privacy@asoose.com"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-zinc-950 no-underline hover:bg-amber-300"
            >
              privacy@asoose.com
            </a>
            <a
              href="mailto:hello@asoose.com"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white no-underline hover:bg-white/10"
            >
              hello@asoose.com
            </a>
          </div>
        </div>
      </section>

      <div className="mt-8 flex items-start gap-3 rounded-2xl bg-zinc-50 p-5 text-xs font-medium leading-relaxed text-zinc-500 dark:bg-white/[0.03] dark:text-zinc-400">
        <Bell className="mt-0.5 shrink-0 text-amber-500" size={16} aria-hidden="true" />
        This web page is the public privacy-policy URL for the Asoose customer
        app. The disclosures here should be kept consistent with the app&apos;s
        Google Play Data safety responses and actual data practices.
      </div>
    </PrivacyLayout>
  );
}
