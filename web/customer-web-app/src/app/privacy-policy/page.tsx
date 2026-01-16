import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - ASOOSE Vendor App",
  description:
    "Privacy Policy for ASOOSE Vendor App - Learn how we collect, use, and protect your business data",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6 sm:p-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
          Privacy Policy
        </h1>
        <p className="text-slate-600 mb-2">
          <strong>Last Updated:</strong> January 16, 2026
        </p>
        <p className="text-slate-600 mb-8">
          <strong>Effective Date:</strong> January 16, 2026
        </p>

        <p className="text-slate-700 mb-4">
          Welcome to the <strong>ASOOSE Vendor App</strong> (&quot;App&quot;).
          This privacy policy explains how we collect, use, store, and protect
          your information when you use our mobile application for managing your
          business on the ASOOSE multi-marketplace platform. ASOOSE connects
          vendors selling any generally accepted products with customers across
          multiple marketplaces.
        </p>

        <p className="text-slate-700 mb-8">
          By using the ASOOSE Vendor App, you agree to the collection and use of
          information in accordance with this policy. If you do not agree with
          our policies and practices, please do not use this App.
        </p>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          1. Information We Collect
        </h2>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          1.1 Personal Information You Provide
        </h3>
        <p className="text-slate-700 mb-3">
          When you register and use the ASOOSE Vendor App, you voluntarily
          provide us with the following personal information:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            <strong>Business Information:</strong> Business name, business email
            address, business type, number of employees
          </li>
          <li>
            <strong>Contact Information:</strong> Phone number (with country
            code), business address
          </li>
          <li>
            <strong>Account Credentials:</strong> Email address and password
            (encrypted)
          </li>
          <li>
            <strong>Store Information:</strong> Store name, store description,
            operating hours
          </li>
          <li>
            <strong>Business Documents:</strong> Business registration
            certificate, tax identification documents, proof of address
            (uploaded during verification)
          </li>
          <li>
            <strong>Bank Account Information:</strong> Bank name, account
            number, account holder name (for receiving payments)
          </li>
          <li>
            <strong>Product Information:</strong> Product listings, product
            names, descriptions, prices, product categories, inventory levels
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          1.2 Images and Media
        </h3>
        <p className="text-slate-700 mb-3">
          You may upload the following images through the App:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            <strong>Product Images:</strong> Photos of your products for display
            to customers across multiple marketplaces
          </li>
          <li>
            <strong>Store Logo:</strong> Your business logo for branding
          </li>
          <li>
            <strong>Store Banner:</strong> Banner image for your store profile
          </li>
          <li>
            <strong>Verification Documents:</strong> Photos of business
            registration, tax documents, and proof of address
          </li>
        </ul>
        <p className="text-slate-700 mb-3">
          <strong>Purpose:</strong> Images are collected to verify your business
          authenticity, display your products to customers, and enhance your
          store&apos;s visual presentation.
        </p>
        <p className="text-slate-700 mb-4">
          <strong>Note:</strong> We only access your device&apos;s photo library
          when you explicitly choose to upload an image. We do not access your
          camera or photo library without your permission.
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          1.3 Location Information
        </h3>
        <p className="text-slate-700 mb-3">
          We collect location data in the following ways:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            <strong>Store Location:</strong> You provide your store&apos;s
            physical location (latitude and longitude) during setup to allow
            customers to find your business and enable delivery services
          </li>
          <li>
            <strong>Permission Required:</strong> We request location permission
            only when you choose to use the &quot;Use Current Location&quot;
            feature during store setup or when editing your business location
          </li>
        </ul>
        <p className="text-slate-700 mb-3">
          <strong>Purpose:</strong> Location data is used solely to:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Display your store&apos;s location to customers</li>
          <li>Calculate delivery distances and fees</li>
          <li>Help customers find nearby vendors</li>
          <li>Enable map-based features within the App</li>
        </ul>
        <p className="text-slate-700 mb-4">
          <strong>Note:</strong> We do not track your location continuously.
          Location permission is only used when you explicitly set or update
          your store location.
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          1.4 Push Notification Information
        </h3>
        <p className="text-slate-700 mb-3">
          We collect and use push notification tokens to send you:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>New order notifications</li>
          <li>Order status updates</li>
          <li>Payment received notifications</li>
          <li>Customer messages</li>
          <li>Account alerts</li>
          <li>Promotional updates (optional)</li>
        </ul>
        <p className="text-slate-700 mb-3">
          <strong>Purpose:</strong> Notifications help you manage your business
          in real-time by alerting you to new orders and important updates.
        </p>
        <p className="text-slate-700 mb-4">
          <strong>Control:</strong> You can manage notification preferences in
          the App settings or your device settings.
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          1.5 Device Information
        </h3>
        <p className="text-slate-700 mb-3">
          We automatically collect certain device information, including:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Device type and model</li>
          <li>Operating system version (Android/iOS)</li>
          <li>Unique device identifiers</li>
          <li>App version</li>
          <li>IP address</li>
        </ul>
        <p className="text-slate-700 mb-4">
          <strong>Purpose:</strong> Device information helps us ensure app
          compatibility, troubleshoot issues, and improve app performance.
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          1.6 Usage Information
        </h3>
        <p className="text-slate-700 mb-3">
          We collect information about how you use the App:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Features you access (menu management, orders, payments)</li>
          <li>Time spent in the App</li>
          <li>
            Actions taken (adding products, accepting orders, updating status)
          </li>
          <li>Error logs and crash reports</li>
        </ul>
        <p className="text-slate-700 mb-4">
          <strong>Purpose:</strong> Usage data helps us understand how vendors
          use the App and identify areas for improvement.
        </p>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          2. How We Use Your Information
        </h2>

        <p className="text-slate-700 mb-4">
          We use the collected information for the following purposes:
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          2.1 Service Delivery
        </h3>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Create and manage your vendor account</li>
          <li>Verify your business legitimacy and prevent fraud</li>
          <li>Enable you to list and manage your products</li>
          <li>Process and manage customer orders</li>
          <li>Facilitate payments and withdrawals to your bank account</li>
          <li>Display your store information to customers</li>
          <li>Enable communication with customers through the platform</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          2.2 Business Operations
        </h3>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            Send you important notifications about orders, payments, and account
            activity
          </li>
          <li>Provide customer support and respond to your inquiries</li>
          <li>Monitor compliance with our Terms of Service</li>
          <li>Detect and prevent prohibited products, fraud, and abuse</li>
          <li>Resolve disputes and enforce our agreements</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          2.3 Improvement and Analytics
        </h3>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Analyze app performance and usage patterns</li>
          <li>Identify and fix technical issues</li>
          <li>Develop new features and improve existing ones</li>
          <li>Conduct research and development</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          2.4 Marketing (With Your Consent)
        </h3>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Send promotional notifications about new features</li>
          <li>Share business tips and best practices</li>
          <li>Notify you about special programs or opportunities</li>
        </ul>
        <p className="text-slate-700 mb-4">
          <strong>Note:</strong> You can opt out of marketing notifications at
          any time through the App settings.
        </p>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          3. Information Sharing and Disclosure
        </h2>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-6 rounded">
          <p className="text-slate-700">
            <strong>Important:</strong> We do not sell your personal information
            to third parties. We only share your data as described below.
          </p>
        </div>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          3.1 With Customers
        </h3>
        <p className="text-slate-700 mb-3">
          The following information is visible to customers on the ASOOSE
          platform:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Store name and description</li>
          <li>Store logo and banner</li>
          <li>Store location and operating hours</li>
          <li>Product listings (names, descriptions, prices, images)</li>
          <li>Product availability status</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          3.2 Service Providers
        </h3>
        <p className="text-slate-700 mb-3">
          We share information with trusted third-party service providers who
          perform services on our behalf:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            <strong>Expo (by EAS):</strong> App hosting, push notifications, and
            development infrastructure
          </li>
          <li>
            <strong>Cloud Storage Provider:</strong> Secure storage of uploaded
            images and documents
          </li>
          <li>
            <strong>Payment Processor:</strong> Processing vendor payouts to
            bank accounts
          </li>
          <li>
            <strong>Communication Services:</strong> Sending notifications and
            emails
          </li>
        </ul>
        <p className="text-slate-700 mb-4">
          These providers are bound by confidentiality agreements and are only
          permitted to use your data to perform services on our behalf.
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          3.3 Legal Requirements
        </h3>
        <p className="text-slate-700 mb-3">
          We may disclose your information if required to do so by law or in
          response to:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Legal processes (subpoenas, court orders)</li>
          <li>Government or regulatory requests</li>
          <li>Protection of our rights, property, or safety</li>
          <li>Protection of users or the public from harm</li>
          <li>Detection and prevention of fraud or security issues</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          3.4 Business Transfers
        </h3>
        <p className="text-slate-700 mb-4">
          If ASOOSE is involved in a merger, acquisition, or sale of assets,
          your information may be transferred as part of that transaction. We
          will notify you of any such change in ownership or control.
        </p>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          4. Data Storage and Security
        </h2>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          4.1 How We Store Your Data
        </h3>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            <strong>Encryption in Transit:</strong> All data transmitted between
            the App and our servers is encrypted using HTTPS/TLS protocols
          </li>
          <li>
            <strong>Encryption at Rest:</strong> Sensitive data (passwords, bank
            account information) is encrypted in our databases
          </li>
          <li>
            <strong>Secure Storage:</strong> Account credentials are stored
            using industry-standard secure storage on your device (Expo
            SecureStore)
          </li>
          <li>
            <strong>Access Controls:</strong> Only authorized personnel can
            access vendor data, and access is logged
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          4.2 Data Retention
        </h3>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            We retain your information for as long as your account is active
          </li>
          <li>
            If you delete your account, we will delete or anonymize your
            personal information within 90 days, except where we are legally
            required to retain it
          </li>
          <li>
            Transaction records may be retained for tax and legal compliance
            purposes
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          4.3 Security Measures
        </h3>
        <p className="text-slate-700 mb-3">
          While we implement reasonable security measures, please be aware that:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>No method of transmission over the internet is 100% secure</li>
          <li>
            You are responsible for maintaining the confidentiality of your
            password
          </li>
          <li>You should not share your account credentials with anyone</li>
          <li>You should log out after using shared devices</li>
        </ul>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          5. Your Rights and Choices
        </h2>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          5.1 Access and Update
        </h3>
        <p className="text-slate-700 mb-3">
          You can access and update your information at any time through:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>The &quot;Profile&quot; section of the App</li>
          <li>The &quot;Edit Business&quot; settings</li>
          <li>Contacting our support team</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          5.2 Data Portability
        </h3>
        <p className="text-slate-700 mb-4">
          You have the right to request a copy of your personal data in a
          structured, machine-readable format. Contact us to request your data.
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          5.3 Account Deletion
        </h3>
        <p className="text-slate-700 mb-3">
          You can request deletion of your account through a multi-step process:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Navigate to Settings → Delete Account in the vendor app</li>
          <li>
            Select your reasons for leaving (helps us improve our platform)
          </li>
          <li>Provide optional additional feedback</li>
          <li>Confirm your deletion request</li>
          <li>
            Your request will be sent to our admin team for review and approval
          </li>
        </ul>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-6 rounded">
          <p className="text-slate-700">
            <strong>Important:</strong> Account deletion requests require admin
            approval. You will receive a notification once your request is
            reviewed. This typically takes 2-5 business days.
          </p>
        </div>

        <p className="text-slate-700 mb-3">
          <strong>What happens after deletion approval:</strong>
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Your account will be immediately logged out</li>
          <li>
            Your store will be removed from the marketplace within 24 hours
          </li>
          <li>All product listings will be permanently deleted</li>
          <li>
            Your business information will be removed from our active database
          </li>
          <li>Pending payments will be processed before final deletion</li>
          <li>
            Some data may be retained for legal compliance (tax records,
            transaction history)
          </li>
        </ul>

        <p className="text-slate-700 mb-4">
          <strong>Alternative option:</strong> You can also contact our support
          team at <strong>support@asoose.com</strong> to request account
          deletion manually.
        </p>

        <p className="text-slate-700 mb-4">
          <strong>Note:</strong> Account deletion is permanent and cannot be
          undone once approved. Make sure to download any important data before
          requesting deletion.
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          5.4 Marketing Communications
        </h3>
        <p className="text-slate-700 mb-3">
          You can opt out of promotional notifications at any time by:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Adjusting notification preferences in the App</li>
          <li>Following the unsubscribe link in emails</li>
          <li>Disabling notifications in your device settings</li>
        </ul>
        <p className="text-slate-700 mb-4">
          Note: You will still receive transactional notifications (orders,
          payments) necessary for service delivery.
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          5.5 Permissions Control
        </h3>
        <p className="text-slate-700 mb-3">
          You can manage App permissions through your device settings:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            <strong>Photo Library:</strong> Required only for uploading images
          </li>
          <li>
            <strong>Location:</strong> Required only for setting store location
            (optional feature)
          </li>
          <li>
            <strong>Notifications:</strong> Can be disabled in device settings
          </li>
        </ul>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          6. Children&apos;s Privacy
        </h2>

        <p className="text-slate-700 mb-4">
          The ASOOSE Vendor App is{" "}
          <strong>
            not intended for use by individuals under the age of 18
          </strong>
          . We do not knowingly collect personal information from children under
          18.
        </p>

        <p className="text-slate-700 mb-3">To use the App, you must:</p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Be at least 18 years of age</li>
          <li>Have legal authority to operate a business</li>
          <li>Comply with all applicable laws and regulations</li>
        </ul>

        <p className="text-slate-700 mb-4">
          If we discover that we have collected information from a person under
          18, we will delete that information immediately.
        </p>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          7. Third-Party Services
        </h2>

        <p className="text-slate-700 mb-4">
          The App uses the following third-party services:
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          7.1 Expo (EAS)
        </h3>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Push notification delivery</li>
          <li>App hosting and updates</li>
          <li>Development tools</li>
        </ul>
        <p className="text-slate-700 mb-4">
          Expo&apos;s Privacy Policy:{" "}
          <a
            href="https://expo.dev/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 hover:text-sky-700 underline"
          >
            https://expo.dev/privacy
          </a>
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          7.2 No Analytics or Advertising SDKs
        </h3>
        <p className="text-slate-700 mb-3">
          The ASOOSE Vendor App does <strong>not</strong> include:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            Google Analytics, Firebase Analytics, or similar analytics services
          </li>
          <li>Advertising SDKs or ad networks</li>
          <li>Social media SDKs for tracking</li>
          <li>Third-party behavioral tracking tools</li>
        </ul>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          8. Payment Processing
        </h2>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-6 rounded">
          <p className="text-slate-700">
            <strong>Important:</strong> The ASOOSE Vendor App does not process
            customer payments. All customer transactions are handled through the
            main ASOOSE platform.
          </p>
        </div>

        <p className="text-slate-700 mb-3">
          <strong>What happens with payments:</strong>
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Customers pay through the ASOOSE customer app</li>
          <li>Payments are processed by ASOOSE&apos;s payment processor</li>
          <li>You receive payout notifications through the Vendor App</li>
          <li>Payouts are transferred to your registered bank account</li>
        </ul>

        <p className="text-slate-700 mb-3">
          <strong>Bank Account Information:</strong>
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>We collect your bank account details to facilitate payouts</li>
          <li>Bank account information is encrypted and stored securely</li>
          <li>We do not store full account numbers in plain text</li>
          <li>Bank information is only used for payout processing</li>
        </ul>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          9. Content Moderation and Prohibited Items
        </h2>

        <p className="text-slate-700 mb-4">
          To maintain a safe, legal, and trustworthy marketplace, we strictly
          monitor vendor content and enforce our prohibited items policy.
        </p>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          9.1 Prohibited Items on ASOOSE Marketplace
        </h3>

        <div className="bg-red-50 border-l-4 border-red-500 p-4 my-6 rounded">
          <p className="text-slate-700 font-semibold mb-2">
            The following items are strictly prohibited from being listed or
            sold on the ASOOSE platform:
          </p>
        </div>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Illegal & Controlled Substances
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>
            Illegal drugs, narcotics, and controlled substances (marijuana,
            cocaine, heroin, etc.)
          </li>
          <li>
            Drug paraphernalia (pipes, bongs, syringes for non-medical use)
          </li>
          <li>Prescription medications without proper licensing</li>
          <li>Counterfeit or unauthorized pharmaceuticals</li>
          <li>Performance-enhancing drugs and steroids (non-prescribed)</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Alcohol & Tobacco Products
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>
            Alcoholic beverages (beer, wine, spirits, liquor) without proper
            licensing
          </li>
          <li>Tobacco products (cigarettes, cigars, chewing tobacco, snuff)</li>
          <li>
            Electronic cigarettes, vapes, and vaping products (e-liquids,
            cartridges)
          </li>
          <li>Smoking accessories (except decorative items)</li>
          <li>Hookah tobacco and related products</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Weapons & Dangerous Items
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>Firearms, guns (real or realistic replicas), ammunition</li>
          <li>Explosives, fireworks, pyrotechnics, and incendiary devices</li>
          <li>
            Knives and blades intended as weapons (combat knives, daggers)
          </li>
          <li>Tasers, stun guns, pepper spray, mace</li>
          <li>
            Brass knuckles, nunchucks, throwing stars, and martial arts weapons
          </li>
          <li>3D-printed weapons or weapon parts</li>
          <li>Chemical weapons or hazardous materials</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Adult & Explicit Content
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>Pornographic materials (videos, magazines, images)</li>
          <li>Adult toys and sexual wellness products</li>
          <li>Erotic or sexually explicit content</li>
          <li>Services of an adult or sexual nature</li>
          <li>Escort or prostitution services</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Counterfeit & Stolen Goods
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>
            Counterfeit products (fake designer bags, knockoff electronics)
          </li>
          <li>Replicas or imitations branded as authentic</li>
          <li>Stolen goods or items of unknown origin</li>
          <li>Pirated software, movies, music, or digital content</li>
          <li>
            Unauthorized copies of copyrighted materials (books, DVDs, games)
          </li>
          <li>Products infringing on intellectual property rights</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Protected Wildlife & Animal Products
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>Live animals (pets, livestock, exotic animals)</li>
          <li>
            Endangered species products (ivory, turtle shells, exotic skins)
          </li>
          <li>Animal parts or taxidermy of protected species</li>
          <li>
            Illegal wildlife products (rhino horn, tiger bones, shark fins)
          </li>
          <li>Products made from dog or cat fur/leather</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Financial & Legal Instruments
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>Counterfeit currency, fake money, or money-printing equipment</li>
          <li>Stolen credit cards, debit cards, or payment card information</li>
          <li>Forged documents (IDs, passports, diplomas, certificates)</li>
          <li>Lottery tickets from unauthorized sellers</li>
          <li>Pyramid schemes or multi-level marketing (MLM) recruitment</li>
          <li>Investment schemes, get-rich-quick programs</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Hazardous & Restricted Materials
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>
            Toxic chemicals, poisons, pesticides (without proper licensing)
          </li>
          <li>Radioactive materials or items containing asbestos</li>
          <li>Medical waste or biohazardous materials</li>
          <li>Recalled products or items banned by regulatory agencies</li>
          <li>Airbags or other automotive safety equipment (used/deployed)</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Offensive & Hateful Items
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>Products promoting hate speech, racism, or discrimination</li>
          <li>Nazi memorabilia or symbols promoting violence</li>
          <li>Items glorifying terrorism or extremist ideologies</li>
          <li>Products that mock or demean protected groups</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Medical Devices & Healthcare Products (Unlicensed)
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>
            Medical devices requiring FDA/regulatory approval (without license)
          </li>
          <li>
            Contact lenses or prescription eyewear (without authorization)
          </li>
          <li>Breast milk or human body parts/fluids</li>
          <li>Unapproved COVID-19 tests, vaccines, or treatments</li>
          <li>Miracle cures or unproven medical treatments</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Digital & Virtual Items
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>Hacked or stolen accounts (gaming, social media, streaming)</li>
          <li>Account credentials or login information</li>
          <li>Cheats, hacks, or exploits for games/software</li>
          <li>Pirated software licenses or activation keys</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-700 mt-5 mb-2">
          Other Prohibited Items
        </h4>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-1">
          <li>Lock-picking tools and security bypass devices</li>
          <li>Surveillance equipment for illegal spying</li>
          <li>Police badges, uniforms, or law enforcement equipment</li>
          <li>Event tickets above face value (scalping/price gouging)</li>
          <li>Expired food products or unsafe consumables</li>
          <li>Baby formula from unauthorized or unsafe sources</li>
          <li>Used cosmetics, opened personal care items, or used underwear</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          9.2 Marketplace Compliance Requirements
        </h3>
        <p className="text-slate-700 mb-3">
          In addition to prohibited items, vendors must ensure:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            <strong>Accurate Descriptions:</strong> Products must be described
            truthfully without misleading claims
          </li>
          <li>
            <strong>Appropriate Pricing:</strong> No price gouging or unfair
            pricing practices
          </li>
          <li>
            <strong>Clear Images:</strong> High-quality photos showing actual
            products
          </li>
          <li>
            <strong>Proper Categorization:</strong> Items listed in correct
            categories
          </li>
          <li>
            <strong>Legal Compliance:</strong> Adherence to local, state, and
            federal regulations
          </li>
          <li>
            <strong>Food Safety:</strong> Compliance with health department
            requirements (for food vendors)
          </li>
          <li>
            <strong>Business Licensing:</strong> Valid permits and licenses for
            regulated products
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-3">
          9.3 Enforcement Actions
        </h3>
        <p className="text-slate-700 mb-3">We reserve the right to:</p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Remove products that violate our prohibited items policy</li>
          <li>Issue warnings for first-time violations</li>
          <li>Suspend accounts for repeated violations</li>
          <li>Permanently terminate accounts for serious violations</li>
          <li>Report illegal activity to law enforcement authorities</li>
          <li>Cooperate with regulatory agencies in investigations</li>
          <li>Withhold payments for prohibited transactions</li>
        </ul>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-6 rounded">
          <p className="text-slate-700">
            <strong>Important:</strong> If you&apos;re unsure whether a product
            is allowed, contact our support team at{" "}
            <strong>compliance@asoose.com</strong> before listing it. Vendors
            are solely responsible for ensuring their products comply with all
            applicable laws and ASOOSE policies.
          </p>
        </div>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          10. International Data Transfers
        </h2>

        <p className="text-slate-700 mb-3">
          ASOOSE operates globally, and your information may be transferred to
          and processed in countries other than your own. When we transfer data
          internationally:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>We ensure adequate safeguards are in place</li>
          <li>We comply with applicable data protection laws</li>
          <li>We use standard contractual clauses where required</li>
        </ul>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          11. Changes to This Privacy Policy
        </h2>

        <p className="text-slate-700 mb-3">
          We may update this Privacy Policy from time to time to reflect:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Changes in our practices</li>
          <li>New features or services</li>
          <li>Legal or regulatory requirements</li>
          <li>User feedback</li>
        </ul>

        <p className="text-slate-700 mb-3">
          <strong>Notification of Changes:</strong>
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            Material changes will be communicated through in-app notifications
          </li>
          <li>The &quot;Last Updated&quot; date will be revised</li>
          <li>
            Continued use of the App constitutes acceptance of the updated
            policy
          </li>
        </ul>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          12. Contact Us
        </h2>

        <div className="bg-sky-50 border-l-4 border-sky-500 p-5 my-6 rounded">
          <p className="text-slate-700 mb-4">
            <strong>
              If you have questions, concerns, or requests regarding this
              Privacy Policy or your data, please contact us:
            </strong>
          </p>
          <p className="text-slate-700 mb-2">
            <strong>Email:</strong> support@asoose.com
          </p>
          <p className="text-slate-700 mb-2">
            <strong>Privacy Team:</strong> privacy@asoose.com
          </p>
          <p className="text-slate-700 mb-2">
            <strong>Address:</strong> ASOOSE Ltd., [Your Business Address]
          </p>
          <p className="text-slate-700 mb-4">
            <strong>Phone:</strong> [Your Support Phone Number]
          </p>
          <p className="text-slate-700">
            <strong>Complete Privacy Policy:</strong>{" "}
            <a
              href="https://asoose.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:text-sky-700 underline"
            >
              https://asoose.com/privacy-policy
            </a>
          </p>
        </div>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          13. Legal Basis for Processing (GDPR)
        </h2>

        <p className="text-slate-700 mb-3">
          If you are in the European Economic Area (EEA), our legal basis for
          processing your data includes:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>
            <strong>Contract Performance:</strong> Processing necessary to
            provide vendor services
          </li>
          <li>
            <strong>Legitimate Interests:</strong> Fraud prevention, service
            improvement, security
          </li>
          <li>
            <strong>Consent:</strong> Marketing communications, optional
            features
          </li>
          <li>
            <strong>Legal Obligations:</strong> Tax compliance, regulatory
            requirements
          </li>
        </ul>

        <p className="text-slate-700 mb-3">
          <strong>Your GDPR Rights:</strong>
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Right to access your data</li>
          <li>Right to rectification</li>
          <li>Right to erasure (&quot;right to be forgotten&quot;)</li>
          <li>Right to restrict processing</li>
          <li>Right to data portability</li>
          <li>Right to object to processing</li>
          <li>Right to withdraw consent</li>
          <li>Right to lodge a complaint with a supervisory authority</li>
        </ul>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mt-10 mb-4 pb-3 border-b-2 border-slate-200">
          14. California Privacy Rights (CCPA)
        </h2>

        <p className="text-slate-700 mb-3">
          If you are a California resident, you have the right to:
        </p>
        <ul className="list-disc ml-6 mb-4 text-slate-700 space-y-2">
          <li>Know what personal information we collect, use, and share</li>
          <li>Request deletion of your personal information</li>
          <li>
            Opt-out of the &quot;sale&quot; of personal information (we do not
            sell data)
          </li>
          <li>Non-discrimination for exercising your privacy rights</li>
        </ul>

        <p className="text-slate-700 mb-8">
          To exercise these rights, contact us at{" "}
          <strong>privacy@asoose.com</strong>
        </p>

        <div className="mt-12 pt-8 border-t-2 border-slate-200 text-center text-slate-600 text-sm">
          <p className="mb-2">&copy; 2026 ASOOSE Ltd. All rights reserved.</p>
          <p>This Privacy Policy is effective as of January 16, 2026</p>
        </div>
      </div>
    </div>
  );
}
