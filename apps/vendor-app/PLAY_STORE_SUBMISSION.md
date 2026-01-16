# Google Play Store Submission Guide
## ASOOSE Vendor App - Complete Deployment Checklist

**Date:** January 16, 2026  
**App Version:** 1.0.0  
**Package Name:** com.asoose.vendor.app

---

## 📋 Table of Contents

1. [Android Permissions Report](#android-permissions-report)
2. [Data Safety Form Answers](#data-safety-form-answers)
3. [Privacy Policy](#privacy-policy)
4. [Risk Assessment Checklist](#risk-assessment-checklist)
5. [Build Instructions](#build-instructions)
6. [Final Deployment Checklist](#final-deployment-checklist)

---

## 🔐 Android Permissions Report

### Required Permissions

Based on app functionality analysis, the following permissions are **REQUIRED**:

#### 1. **INTERNET** (Automatic)
- **Purpose:** Communication with backend API
- **User Visible:** No
- **Required for:** Login, orders, products, notifications, payments
- **Justification:** Essential for all app functionality

#### 2. **READ_MEDIA_IMAGES** (Android 13+) / **READ_EXTERNAL_STORAGE** (Android 12 and below)
- **Purpose:** Selecting product images, store logo, banner, and verification documents
- **User Visible:** Yes (runtime permission)
- **Required for:** 
  - Uploading product images during menu item creation
  - Uploading store logo and banner during setup
  - Uploading business verification documents (registration cert, tax ID, proof of address)
- **Runtime Request:** Only when user taps "Upload Image" or "Add Product Image"
- **SDK Used:** `expo-image-picker` (^17.0.10)
- **Justification:** Vendors need to upload product photos and business documents

#### 3. **ACCESS_FINE_LOCATION** (Optional)
- **Purpose:** Auto-fill store location during setup
- **User Visible:** Yes (runtime permission)
- **Required for:** 
  - "Use Current Location" feature during store setup
  - Optional convenience feature for vendors
- **Runtime Request:** Only when user taps "Use Current Location" button
- **SDK Used:** `expo-location` (^19.0.8)
- **Justification:** Helps vendors quickly set their store address
- **Note:** NOT required for core app functionality - purely optional

#### 4. **POST_NOTIFICATIONS** (Android 13+)
- **Purpose:** Send order notifications, payment updates, and business alerts
- **User Visible:** Yes (runtime permission on Android 13+)
- **Required for:**
  - New order notifications
  - Order status updates
  - Payment received notifications
  - Customer messages
  - Low stock alerts
- **SDK Used:** `expo-notifications` (^0.32.16)
- **Justification:** Critical for vendors to receive timely order notifications

#### 5. **VIBRATE** (Automatic with notifications)
- **Purpose:** Vibrate device for important notifications
- **User Visible:** No
- **Required for:** Notification alerts
- **Justification:** Helps vendors notice new orders

#### 6. **WAKE_LOCK** (Automatic)
- **Purpose:** Keep device awake during critical operations
- **User Visible:** No
- **Required for:** Push notification delivery
- **Justification:** Ensures notifications are delivered even when screen is off

### Permissions NOT Used

✅ **CAMERA** - Not requested (users select from gallery only)  
✅ **ACCESS_COARSE_LOCATION** - Not used  
✅ **ACCESS_BACKGROUND_LOCATION** - Not used  
✅ **RECORD_AUDIO** - Not used  
✅ **CALL_PHONE** - Not used  
✅ **SEND_SMS** - Not used  
✅ **READ_CONTACTS** - Not used  
✅ **BLUETOOTH** - Not used

### Recommended app.json Configuration

```json
{
  "expo": {
    "android": {
      "permissions": [
        "INTERNET",
        "ACCESS_FINE_LOCATION",
        "POST_NOTIFICATIONS"
      ],
      "blockedPermissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "ACCESS_BACKGROUND_LOCATION",
        "READ_CONTACTS",
        "CALL_PHONE"
      ]
    },
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "This app needs access to your photo library to upload product images, store logos, and business verification documents."
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "This app needs your location to help you set your store address. Location is only used when you tap 'Use Current Location'."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#0EA5E9",
          "sounds": ["./assets/sounds/order-notification.wav"]
        }
      ]
    ]
  }
}
```

---

## 📝 Data Safety Form Answers

Use these exact answers when filling out the Google Play Console Data Safety section:

### Section 1: Data Collection and Security

**Does your app collect or share any of the required user data types?**
- ✅ **Yes**

**Is all of the user data collected by your app encrypted in transit?**
- ✅ **Yes**
- All data is transmitted over HTTPS/TLS

**Do you provide a way for users to request that their data is deleted?**
- ✅ **Yes**
- Users can delete their account via App Settings → Delete Account
- Users can email support@asoose.com to request deletion

---

### Section 2: Data Types Collected

#### **Personal Information**

##### Location
- **Collected:** ✅ Yes
- **Shared:** ❌ No
- **Optional:** ✅ Yes (only if user taps "Use Current Location")
- **Purpose:** 
  - ✅ App functionality
  - Used to set store address for customer delivery
- **Data handling:**
  - **Ephemeral:** ❌ No (stored as store address)

##### Name
- **Collected:** ✅ Yes
- **Shared:** ❌ No (only business name shown to customers)
- **Optional:** ❌ No
- **Purpose:**
  - ✅ App functionality
  - ✅ Account management
- **Data handling:**
  - **Ephemeral:** ❌ No

##### Email address
- **Collected:** ✅ Yes
- **Shared:** ❌ No
- **Optional:** ❌ No
- **Purpose:**
  - ✅ App functionality
  - ✅ Account management
  - ✅ Fraud prevention, security, and compliance
- **Data handling:**
  - **Ephemeral:** ❌ No

##### Phone number
- **Collected:** ✅ Yes
- **Shared:** ❌ No
- **Optional:** ❌ No
- **Purpose:**
  - ✅ App functionality
  - ✅ Account management
  - ✅ Fraud prevention, security, and compliance
- **Data handling:**
  - **Ephemeral:** ❌ No

#### **Financial Information**

##### User payment info (Bank account details)
- **Collected:** ✅ Yes
- **Shared:** ✅ Yes (only with payment processor for payouts)
- **Optional:** ❌ No
- **Purpose:**
  - ✅ App functionality (vendor payouts)
- **Data handling:**
  - **Ephemeral:** ❌ No
  - **Encrypted:** ✅ Yes

**Note:** Customers do NOT pay through the vendor app. This is only for receiving payouts.

#### **Photos and Videos**

##### Photos
- **Collected:** ✅ Yes
- **Shared:** ✅ Yes (displayed to customers on marketplace)
- **Optional:** ❌ No (required for product listings)
- **Purpose:**
  - ✅ App functionality (product display)
- **Data handling:**
  - **Ephemeral:** ❌ No

#### **Files and Docs**

##### Files and docs (Business verification documents)
- **Collected:** ✅ Yes
- **Shared:** ❌ No (internal verification only)
- **Optional:** ❌ No (required for account verification)
- **Purpose:**
  - ✅ Fraud prevention, security, and compliance
  - ✅ Account management
- **Data handling:**
  - **Ephemeral:** ❌ No

#### **App Activity**

##### App interactions
- **Collected:** ✅ Yes
- **Shared:** ❌ No
- **Optional:** ❌ No
- **Purpose:**
  - ✅ Analytics
  - ✅ App functionality
- **Data handling:**
  - **Ephemeral:** ❌ No

##### In-app search history
- **Collected:** ❌ No

##### Installed apps
- **Collected:** ❌ No

##### Other user-generated content (Product descriptions, store info)
- **Collected:** ✅ Yes
- **Shared:** ✅ Yes (displayed to customers)
- **Optional:** ❌ No
- **Purpose:**
  - ✅ App functionality
- **Data handling:**
  - **Ephemeral:** ❌ No

##### Other actions (Order management)
- **Collected:** ✅ Yes
- **Shared:** ❌ No
- **Optional:** ❌ No
- **Purpose:**
  - ✅ App functionality
- **Data handling:**
  - **Ephemeral:** ❌ No

#### **Web Browsing**

##### Web browsing history
- **Collected:** ❌ No

#### **App Info and Performance**

##### Crash logs
- **Collected:** ✅ Yes
- **Shared:** ❌ No
- **Optional:** ❌ No (automatic)
- **Purpose:**
  - ✅ Analytics
  - ✅ App functionality
- **Data handling:**
  - **Ephemeral:** ✅ Yes (deleted after 90 days)

##### Diagnostics
- **Collected:** ✅ Yes
- **Shared:** ❌ No
- **Optional:** ❌ No (automatic)
- **Purpose:**
  - ✅ Analytics
  - ✅ App functionality
- **Data handling:**
  - **Ephemeral:** ✅ Yes (deleted after 90 days)

##### Other app performance data
- **Collected:** ❌ No

#### **Device or Other IDs**

##### Device or other IDs
- **Collected:** ✅ Yes (for push notifications only)
- **Shared:** ✅ Yes (with Expo push notification service)
- **Optional:** ✅ Yes (user can deny notification permission)
- **Purpose:**
  - ✅ App functionality (push notifications)
- **Data handling:**
  - **Ephemeral:** ❌ No

---

### Section 3: Data Sharing

**Do you share data with third parties?**
- ✅ **Yes**

**Third-party data sharing:**

1. **Expo Push Notification Service**
   - Data shared: Device push token
   - Purpose: Deliver order and payment notifications
   - Is data transferred off device: ✅ Yes

2. **Payment Processor** (name your actual processor)
   - Data shared: Bank account information
   - Purpose: Process vendor payouts
   - Is data transferred off device: ✅ Yes

3. **Cloud Storage Provider** (name your actual provider)
   - Data shared: Uploaded images and documents
   - Purpose: Store and deliver product images
   - Is data transferred off device: ✅ Yes

**Data NOT shared with:**
- ❌ Advertising companies
- ❌ Analytics providers (no Google Analytics, Firebase, etc.)
- ❌ Data brokers
- ❌ Social media companies

---

### Section 4: Security Practices

**Is all user data encrypted in transit?**
- ✅ **Yes** - HTTPS/TLS encryption

**Can users request data deletion?**
- ✅ **Yes**
- In-app: Settings → Delete Account
- Email: support@asoose.com

**Is your app committed to following Google Play's Families Policy?**
- ❌ **No** (App is for business use, 18+ only)

**Has your app undergone a security review?**
- ✅ **Yes** (if you have) / ❌ **No** (if pending)

**Do you have a privacy policy?**
- ✅ **Yes**
- URL: `https://[your-domain]/privacy-policy.html` ← **Deploy the privacy-policy.html file first**

---

## 🌐 Privacy Policy

### Hosting Instructions

1. **Upload `privacy-policy.html` to a public web server:**
   - **Option 1:** Vercel (recommended)
     ```bash
     cd apps/vendor-app
     vercel --prod privacy-policy.html
     ```
   - **Option 2:** Netlify
     - Drag and drop privacy-policy.html to Netlify dashboard
   - **Option 3:** GitHub Pages
     - Create repo, push privacy-policy.html, enable GitHub Pages
   - **Option 4:** Your existing website
     - Upload to `https://asoose.com/vendor-privacy-policy.html`

2. **Get the public URL** (e.g., `https://asoose-vendor-privacy.vercel.app/`)

3. **Add URL to app.json:**
   ```json
   {
     "expo": {
       "privacy": "https://asoose-vendor-privacy.vercel.app/"
     }
   }
   ```

4. **Add URL to Google Play Console:**
   - Store Presence → Store Listing → Privacy Policy

---

## ⚠️ Risk Assessment Checklist

### Critical User Flows - Test Before Submission

#### ✅ Authentication
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] Password reset flow works end-to-end
- [ ] Signup flow completes successfully
- [ ] Document upload succeeds during signup
- [ ] App handles network errors gracefully

#### ✅ Menu Management
- [ ] Add new product with image succeeds
- [ ] Edit product updates correctly
- [ ] Delete product removes from list
- [ ] Toggle stock status works
- [ ] Product image upload completes
- [ ] Product form validation works

#### ✅ Order Management
- [ ] New order notification received
- [ ] Order list loads without crash
- [ ] Order details display correctly
- [ ] Accept order updates status
- [ ] Decline order works
- [ ] Order status transitions work

#### ✅ Payments/Withdrawals
- [ ] Payment history loads
- [ ] Withdrawal request succeeds
- [ ] Bank account can be added/edited
- [ ] Balance displays correctly

#### ✅ Location Feature
- [ ] Location permission request works
- [ ] "Use Current Location" works
- [ ] Map displays correctly
- [ ] Store location saves properly
- [ ] App works if location permission denied

#### ✅ Image Upload
- [ ] Photo library permission request works
- [ ] Image selection from gallery works
- [ ] Image upload progress shows
- [ ] Upload completes successfully
- [ ] App works if photo permission denied
- [ ] Large images are handled

#### ✅ Notifications
- [ ] Notification permission request works
- [ ] Push notifications received
- [ ] Notification tap opens correct screen
- [ ] Notification settings save correctly
- [ ] App works if notification permission denied

#### ✅ Error Handling
- [ ] No internet: Shows error message
- [ ] Server error: Shows appropriate message
- [ ] Invalid token: Redirects to login
- [ ] Upload fails: Shows retry option
- [ ] No blank/white screens on any flow

### Potential Rejection Risks

**🟢 LOW RISK:**
- ✅ Permissions properly justified
- ✅ Privacy policy comprehensive
- ✅ No sensitive permissions (camera, contacts, etc.)
- ✅ Clear app purpose (business management)
- ✅ No advertising or tracking

**🟡 MEDIUM RISK:**
- ⚠️ Financial data collection - **Mitigation:** Clear privacy policy, encryption, necessary for payouts
- ⚠️ Location collection - **Mitigation:** Optional feature, clear justification, not background
- ⚠️ Document uploads - **Mitigation:** Required for business verification, stated in privacy policy

**🔴 HIGH RISK (NONE DETECTED):**
- ✅ No children's content issues (18+ app)
- ✅ No deceptive behavior
- ✅ No malware or security risks
- ✅ No spam or unwanted content

---

## 🏗️ Build Instructions

### Prerequisites

1. **EAS CLI installed:**
   ```bash
   npm install -g eas-cli
   ```

2. **Logged into Expo:**
   ```bash
   eas login
   ```

3. **Privacy policy deployed and URL obtained**

4. **App updated with production API URL**

### Step 1: Update Configuration

**Edit `apps/vendor-app/app.json`:**

```json
{
  "expo": {
    "name": "ASOOSE VENDOR APP",
    "version": "1.0.0",
    "android": {
      "versionCode": 1,
      "package": "com.asoose.vendor.app",
      "permissions": [
        "INTERNET",
        "ACCESS_FINE_LOCATION",
        "POST_NOTIFICATIONS"
      ],
      "blockedPermissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    },
    "privacy": "https://[YOUR_PRIVACY_POLICY_URL]"
  }
}
```

**Edit `apps/vendor-app/eas.json`:**

```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.asoose.com/v1/api"
      }
    }
  }
}
```

### Step 2: Build Production AAB

```bash
cd apps/vendor-app
eas build --profile production --platform android
```

**What happens:**
- EAS builds a production Android App Bundle (.aab)
- Version code auto-increments
- Build is optimized and signed
- Download link provided when complete

### Step 3: Download AAB

```bash
# EAS will provide download URL
# Or download from: https://expo.dev/accounts/[account]/projects/asoose-vendor-app/builds
```

### Step 4: Test Build (Optional but Recommended)

**Install on test device:**

```bash
# First, build APK for testing
eas build --profile production --platform android --local

# Install APK
adb install build-*.apk
```

**Test critical flows:**
- [ ] Login works
- [ ] Orders display
- [ ] Product upload works
- [ ] Notifications received
- [ ] No crashes

---

## ✅ Final Deployment Checklist

### Before Upload to Play Store

#### App Preparation
- [ ] Privacy policy deployed to public URL
- [ ] Privacy policy URL added to app.json
- [ ] Production API URL set in eas.json
- [ ] App version updated (1.0.0)
- [ ] Version code is 1 (auto-incremented by EAS)
- [ ] App icons and splash screen finalized
- [ ] All permissions justified in app.json
- [ ] Unnecessary permissions blocked
- [ ] Test build installed and tested

#### Play Console Setup
- [ ] Google Play Console account created
- [ ] Developer account verified ($25 fee paid)
- [ ] App created in Play Console
- [ ] Package name matches: `com.asoose.vendor.app`

#### Store Listing
- [ ] App name: "ASOOSE Vendor App"
- [ ] Short description (max 80 chars): "Manage your food business on ASOOSE"
- [ ] Full description written (see template below)
- [ ] App category: Business
- [ ] Target age: 18+
- [ ] Content rating questionnaire completed
- [ ] Store icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots uploaded (4-8 screenshots)
  - Recommended: Login, Dashboard, Menu, Orders, Add Product, Notifications
- [ ] Privacy policy URL added
- [ ] Contact email: support@asoose.com
- [ ] Contact phone (optional)
- [ ] Contact website (optional)

#### Data Safety
- [ ] Data Safety form completed (use answers from this document)
- [ ] All data types marked correctly
- [ ] Third-party sharing disclosed
- [ ] Encryption confirmed
- [ ] Deletion method specified

#### Content Rating
- [ ] IARC questionnaire completed
- [ ] Violence: None
- [ ] Sexual content: None
- [ ] Language: None
- [ ] Controlled substances: None (food only)
- [ ] Gambling: None
- [ ] User interaction: Yes (business-to-customer)
- [ ] Share location: Yes (optional)
- [ ] Share personal info: Yes (with customers)

#### App Content
- [ ] Target audience: Adults 18+
- [ ] Ads: None
- [ ] In-app purchases: None
- [ ] Content guidelines reviewed
- [ ] No deceptive behavior
- [ ] No intellectual property violations

#### Countries and Regions
- [ ] Countries selected (or "All countries")
- [ ] Pricing: Free

### Upload Process

1. **Production → Releases → Create new release**
2. **Upload AAB file** (from EAS build)
3. **Release name:** "Version 1.0.0 - Initial Release"
4. **Release notes:**
   ```
   Welcome to ASOOSE Vendor App!
   
   Manage your food business with ease:
   • Accept and manage customer orders in real-time
   • Add and update your menu items
   • Track payments and request withdrawals
   • Receive instant notifications for new orders
   • Manage your store hours and information
   
   This is our first release. We're excited to help you grow your business!
   ```
5. **Review → Rollout to Production**

### Post-Submission

- [ ] Submission confirmation received
- [ ] Review typically takes 1-7 days
- [ ] Monitor Play Console for review status
- [ ] Respond to any review feedback within 24 hours
- [ ] Plan for updates based on user feedback

---

## 📱 Store Listing Description Template

**Short Description (80 chars max):**
```
Manage your food business on ASOOSE - Orders, menu, and payments
```

**Full Description:**
```
ASOOSE Vendor App - Your Business Management Hub

Grow your food business with the ASOOSE Vendor App. Manage orders, update your menu, and track payments all in one place.

🎯 KEY FEATURES

📦 Order Management
• Receive instant notifications for new orders
• Accept or decline orders with one tap
• Update order status in real-time
• View order history and details
• Communicate with customers

🍽️ Menu Management
• Add new products with photos
• Update prices and descriptions
• Set items as in-stock or out-of-stock
• Organize by categories
• Drag to reorder menu items

💰 Payments & Withdrawals
• Track your earnings
• View payment history
• Request withdrawals to your bank account
• Monitor pending payouts

🔔 Real-Time Notifications
• New order alerts
• Payment confirmations
• Customer messages
• Order status updates

⚙️ Business Settings
• Set your operating hours
• Update store information
• Manage delivery settings
• Upload store logo and banner

🛡️ Security & Privacy
• Secure login with encrypted storage
• Business verification process
• HTTPS encrypted data transmission
• Account data protection

📊 Performance Tracking
• View daily, weekly, and monthly sales
• Track popular products
• Monitor order trends

✨ Why Choose ASOOSE?

• Built specifically for food vendors
• Easy to use interface
• Real-time order notifications
• Secure payment processing
• Reliable customer support
• No hidden fees for the app

📱 Requirements

• Android 5.0 or higher
• Internet connection
• Business verification documents
• Bank account for payouts

🤝 Support

Need help? Contact us at support@asoose.com

⚖️ Business Requirements

• Must be 18 years or older
• Valid business registration
• Compliance with local food safety regulations
• No prohibited products (alcohol, tobacco, drugs)

Join thousands of food vendors growing their business with ASOOSE!
```

---

## 🎨 Screenshot Requirements

**Minimum:** 2 screenshots  
**Maximum:** 8 screenshots  
**Dimensions:** 16:9 or 9:16 aspect ratio  
**Format:** PNG or JPEG  
**Size:** Max 8MB each

**Recommended Screenshots:**

1. **Login Screen** - Show professional login interface
2. **Dashboard** - Display order stats and metrics
3. **Active Orders** - Show order management interface
4. **Menu Management** - Display product list
5. **Add Product** - Show product upload form
6. **Order Details** - Show order information
7. **Notifications** - Show notification list
8. **Store Settings** - Show business profile

**Tips:**
- Use clean, high-quality screenshots
- Show actual app functionality (not mockups)
- Include status bar and navigation
- Consider adding captions/labels
- Show diverse product types
- Avoid showing personal/sensitive data

---

## 📞 Support & Escalation

**If app is rejected:**

1. **Read rejection reason carefully**
2. **Common reasons:**
   - Privacy policy issues → Update policy to be more specific
   - Data safety mismatch → Verify all data types marked correctly
   - Permission justification → Add clearer permission explanations
   - Crash on launch → Test build thoroughly before resubmission
   - Incomplete functionality → Ensure all features work

3. **Fix and resubmit:**
   - Address all feedback
   - Update version code
   - Resubmit with detailed response

4. **Appeal if needed:**
   - Use "Appeal" option in Play Console
   - Provide clear explanation
   - Include screenshots/evidence

---

## 📈 Post-Launch Monitoring

**Week 1:**
- [ ] Monitor crash reports daily
- [ ] Respond to user reviews
- [ ] Track download numbers
- [ ] Check for permission-related issues

**Ongoing:**
- [ ] Plan updates based on feedback
- [ ] Monitor Data Safety compliance
- [ ] Keep privacy policy updated
- [ ] Respond to user reviews within 48 hours

---

**Good luck with your submission! 🚀**

**Questions?** Contact the development team or support@asoose.com
