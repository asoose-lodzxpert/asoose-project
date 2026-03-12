import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - ASOOSE",
  description:
    "Terms of Service for ASOOSE - Read our terms and conditions for using the ASOOSE platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6 sm:p-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
          Terms of Service
        </h1>
        <p className="text-slate-600 mb-2">
          <strong>Last Updated:</strong> January 16, 2026
        </p>
        <p className="text-slate-600 mb-8">
          <strong>Effective Date:</strong> January 16, 2026
        </p>

        <p className="text-slate-700 mb-4">
          Welcome to <strong>ASOOSE</strong> (&quot;Platform&quot;,
          &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). These Terms of
          Service (&quot;Terms&quot;) govern your access to and use of the
          ASOOSE mobile applications, websites, and services, including
          ride-hailing, food &amp; grocery delivery, and logistics services.
        </p>

        <p className="text-slate-700 mb-8">
          By accessing or using the ASOOSE Platform, you agree to be bound by
          these Terms. If you do not agree to these Terms, please do not use our
          services.
        </p>

        {/* 1 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          1. Eligibility
        </h2>
        <p className="text-slate-700 mb-4">
          You must be at least 18 years old to use the ASOOSE Platform. By using
          our services, you represent and warrant that you meet this age
          requirement and that you have the legal capacity to enter into a
          binding agreement.
        </p>

        {/* 2 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          2. Account Registration
        </h2>
        <p className="text-slate-700 mb-3">
          To access most features of the Platform, you must create an account.
          You agree to:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            Provide accurate, current, and complete information during
            registration.
          </li>
          <li>
            Keep your account credentials secure and not share them with anyone.
          </li>
          <li>
            Notify us immediately of any unauthorized use of your account.
          </li>
          <li>
            Be responsible for all activities that occur under your account.
          </li>
        </ul>
        <p className="text-slate-700 mb-4">
          We reserve the right to suspend or terminate accounts that violate
          these Terms or are found to contain false information.
        </p>

        {/* 3 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          3. Services
        </h2>
        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          3.1 Ride-Hailing
        </h3>
        <p className="text-slate-700 mb-4">
          ASOOSE connects passengers with independent drivers. We act solely as
          a technology platform facilitating these connections. Drivers are
          independent contractors and are not employees of ASOOSE. We do not
          guarantee the availability of drivers at any particular time or
          location.
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          3.2 Food, Grocery &amp; Delivery
        </h3>
        <p className="text-slate-700 mb-4">
          ASOOSE facilitates orders between customers and independent vendors.
          Vendors are responsible for the accuracy, quality, and fulfillment of
          their listed products. ASOOSE is not liable for vendor errors,
          out-of-stock items, or food quality issues, though we will work to
          resolve disputes fairly.
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          3.3 Logistics
        </h3>
        <p className="text-slate-700 mb-4">
          Logistics services are provided on a best-effort basis. ASOOSE is not
          liable for delays caused by traffic, weather, or other factors beyond
          our control. Prohibited items (including but not limited to hazardous
          materials, illegal goods, and perishables without proper packaging)
          may not be shipped via our platform.
        </p>

        {/* 4 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          4. Payments and Fees
        </h2>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            <strong>Pricing:</strong> Prices displayed on the Platform are
            inclusive of applicable taxes unless stated otherwise.
          </li>
          <li>
            <strong>Payment Methods:</strong> We accept payment via card, wallet
            balance, and other methods listed in the app at checkout.
          </li>
          <li>
            <strong>Refunds:</strong> Refund eligibility depends on the nature
            of the service and is governed by our Refund Policy, available
            in-app.
          </li>
          <li>
            <strong>Surge Pricing:</strong> Ride fares may increase during
            periods of high demand. You will be notified of the estimated fare
            before confirming a booking.
          </li>
        </ul>

        {/* 5 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          5. User Conduct
        </h2>
        <p className="text-slate-700 mb-3">You agree not to:</p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Use the Platform for any unlawful or fraudulent purpose.</li>
          <li>Harass, abuse, or harm drivers, vendors, or other users.</li>
          <li>
            Attempt to circumvent the Platform&apos;s payment or rating systems.
          </li>
          <li>
            Reverse-engineer, scrape, or interfere with the Platform&apos;s
            technical infrastructure.
          </li>
          <li>
            Upload or transmit viruses, malware, or any other malicious code.
          </li>
          <li>
            Use the Platform to collect personal data of other users without
            their consent.
          </li>
        </ul>
        <p className="text-slate-700 mb-4">
          Violation of these conduct rules may result in immediate account
          suspension and legal action where applicable.
        </p>

        {/* 6 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          6. Intellectual Property
        </h2>
        <p className="text-slate-700 mb-4">
          All content, trademarks, logos, and software on the ASOOSE Platform
          are the intellectual property of ASOOSE Technologies Inc. or its
          licensors. You may not reproduce, distribute, or create derivative
          works from our content without prior written consent.
        </p>

        {/* 7 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          7. Disclaimers and Limitation of Liability
        </h2>
        <p className="text-slate-700 mb-4">
          The ASOOSE Platform is provided &quot;as is&quot; and &quot;as
          available&quot; without warranties of any kind, express or implied. To
          the maximum extent permitted by applicable law, ASOOSE shall not be
          liable for:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Indirect, incidental, or consequential damages.</li>
          <li>Loss of profits, data, or goodwill.</li>
          <li>
            Damages arising from your use of or inability to use the Platform.
          </li>
          <li>
            Acts or omissions of third-party drivers, vendors, or service
            providers.
          </li>
        </ul>
        <p className="text-slate-700 mb-4">
          Our aggregate liability in any circumstance is limited to the amount
          you paid to ASOOSE in the 30 days preceding the claim.
        </p>

        {/* 8 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          8. Indemnification
        </h2>
        <p className="text-slate-700 mb-4">
          You agree to indemnify, defend, and hold harmless ASOOSE Technologies
          Inc., its officers, directors, employees, and agents from and against
          any claims, liabilities, damages, losses, and expenses (including
          reasonable legal fees) arising out of your use of the Platform or
          violation of these Terms.
        </p>

        {/* 9 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          9. Privacy
        </h2>
        <p className="text-slate-700 mb-4">
          Your use of the Platform is also governed by our{" "}
          <a
            href="/privacy-policy"
            className="text-yellow-600 hover:underline font-medium"
          >
            Privacy Policy
          </a>
          , which is incorporated into these Terms by reference.
        </p>

        {/* 10 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          10. Termination
        </h2>
        <p className="text-slate-700 mb-4">
          We reserve the right to suspend or terminate your access to the
          Platform at any time, with or without notice, for conduct that we
          believe violates these Terms or is harmful to other users, third
          parties, or the integrity of the Platform. You may delete your account
          at any time through the app settings.
        </p>

        {/* 11 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          11. Governing Law and Dispute Resolution
        </h2>
        <p className="text-slate-700 mb-4">
          These Terms are governed by and construed in accordance with
          applicable law. Any disputes arising out of or in connection with
          these Terms shall first be attempted to be resolved through good-faith
          negotiation. If unresolved, disputes shall be submitted to binding
          arbitration under the rules of a mutually agreed arbitration body.
        </p>

        {/* 12 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          12. Changes to These Terms
        </h2>
        <p className="text-slate-700 mb-4">
          We may update these Terms from time to time. When we do, we will
          update the &quot;Last Updated&quot; date at the top of this page and
          notify you via the app or email where required by law. Your continued
          use of the Platform after changes take effect constitutes your
          acceptance of the revised Terms.
        </p>

        {/* 13 */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          13. Contact Us
        </h2>
        <p className="text-slate-700 mb-2">
          If you have questions or concerns about these Terms, please contact us
          at:
        </p>
        <ul className="list-none ml-0 mb-4 text-slate-700 space-y-1">
          <li>
            <strong>Email:</strong>{" "}
            <a
              href="mailto:hello@asoose.com"
              className="text-yellow-600 hover:underline"
            >
              legal@asoose.com
            </a>
          </li>
          <li>
            <strong>Website:</strong>{" "}
            <a
              href="https://asoose.com/contact"
              className="text-yellow-600 hover:underline"
            >
              https://asoose.com/contact
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
