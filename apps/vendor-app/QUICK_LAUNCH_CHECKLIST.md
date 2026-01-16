# 🚀 Google Play Store - Quick Launch Checklist

## ⚡ Pre-Build Checklist (Complete First!)

### 1️⃣ Deploy Privacy Policy

- [ ] Upload `privacy-policy.html` to public hosting (Vercel/Netlify/GitHub Pages)
- [ ] Get public URL (e.g., `https://asoose.com/vendor-privacy-policy`)
- [ ] Update `app.json` → `"privacy"` field with URL
- [ ] Test URL in browser - ensure it loads

### 2️⃣ Verify app.json Configuration

- [ ] Package name: `com.asoose.vendor.app`
- [ ] Version: `1.0.0`
- [ ] Android permissions configured (INTERNET, LOCATION, NOTIFICATIONS)
- [ ] Blocked permissions set (CAMERA, RECORD_AUDIO, etc.)
- [ ] Privacy URL added
- [ ] Plugin permissions messages set

### 3️⃣ Verify eas.json Production Config

- [ ] Production API URL set: `https://api.asoose.com/v1/api`
- [ ] Auto-increment enabled: `"autoIncrement": true`

---

## 🏗️ Build Commands

### Build Production AAB

```bash
cd apps/vendor-app
eas build --profile production --platform android
```

### Monitor Build

- Watch build progress at: https://expo.dev/builds
- Download AAB when complete
- Save build URL for later reference

---

## 📱 Google Play Console Setup

### App Creation

- [ ] Create app in Play Console
- [ ] App name: **ASOOSE Vendor APP**
- [ ] Default language: English
- [ ] App type: App
- [ ] Free or paid: Free

### Store Listing

- [ ] Short description: "Manage your multi-marketplace business on ASOOSE - Orders & products"
- [ ] Full description: (Copy from PLAY_STORE_SUBMISSION.md)
- [ ] App icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] 4-8 screenshots uploaded
- [ ] App category: **Business**
- [ ] Contact email: support@asoose.com
- [ ] Privacy policy URL: [Your deployed URL]

### Data Safety

**Critical: Complete accurately to avoid rejection**

✅ Data Collected:

- Location (optional) - App functionality
- Name - Account management
- Email - Account management
- Phone number - Account management
- Bank account - Payouts only
- Photos - Product display
- Business documents - Verification
- App interactions - Analytics
- Device IDs - Push notifications

✅ All data encrypted in transit (HTTPS)
✅ Users can request deletion (Settings → Delete Account)
❌ No data sold to third parties

✅ Shared with:

- Expo (push notifications)
- Payment processor (payouts)
- Cloud storage (images)

❌ NOT shared with:

- Advertisers
- Analytics providers
- Data brokers

### Content Rating

- [ ] Complete IARC questionnaire
- [ ] Target audience: Adults 18+
- [ ] Violence: None
- [ ] Sexual content: None
- [ ] Language: None
- [ ] Controlled substances: None
- [ ] User interaction: Yes
- [ ] Share location: Yes (optional)
- [ ] Share personal info: Yes (business info to customers)

### App Content

- [ ] Target audience: 18+
- [ ] Ads: No
- [ ] In-app purchases: No
- [ ] News app: No
- [ ] COVID-19 contact tracing: No
- [ ] Government app: No

---

## 📤 Upload & Release

### Production Release

- [ ] Go to: Production → Releases → Create new release
- [ ] Upload AAB file (from EAS build)
- [ ] Release name: "Version 1.0.0 - Initial Release"
- [ ] Release notes written
- [ ] Review summary
- [ ] Save as draft first
- [ ] **Review everything twice**
- [ ] Start rollout to Production

---

## ⏰ Timeline Expectations

| Stage                     | Duration      |
| ------------------------- | ------------- |
| Privacy policy deployment | 5 minutes     |
| Production build (EAS)    | 15-30 minutes |
| Play Console setup        | 1-2 hours     |
| Google review             | 1-7 days      |
| **Total**                 | **2-8 days**  |

---

## 🔴 Common Rejection Reasons & Fixes

### Privacy Policy Issues

**Problem:** Policy doesn't match app behavior  
**Fix:** Ensure privacy-policy.html accurately describes all data collection

### Data Safety Mismatch

**Problem:** Data Safety form doesn't match actual collection  
**Fix:** Review PLAY_STORE_SUBMISSION.md Data Safety section carefully

### Permission Issues

**Problem:** Unnecessary permissions requested  
**Fix:** Ensure blockedPermissions includes unused permissions

### Crash on Launch

**Problem:** App crashes during review  
**Fix:** Test build on physical device before submission

### Incomplete Functionality

**Problem:** Features don't work during review  
**Fix:** Ensure production API is live and accessible

---

## ✅ Pre-Submission Testing

**Test on physical Android device:**

```bash
# Build APK for testing
eas build --profile production --platform android --local

# Install
adb install [build-file].apk
```

**Critical flows to test:**

- [ ] Login successful
- [ ] Orders load and display
- [ ] Add product with image upload
- [ ] Notifications received
- [ ] Location permission request
- [ ] Photo library permission request
- [ ] App handles no internet gracefully
- [ ] No crashes or white screens

---

## 📞 Support Contacts

**Technical Issues:**

- Development team

**Play Store Questions:**

- Google Play Support: https://support.google.com/googleplay/android-developer

**App Issues:**

- support@asoose.com

---

## 🎯 Success Criteria

✅ Build completes without errors  
✅ All Play Console sections complete  
✅ Privacy policy live and accessible  
✅ Data Safety accurately filled  
✅ Screenshots professional and clear  
✅ Test build runs without crashes  
✅ All permissions justified

**When all above are ✅, you're ready to submit!**

---

## 📊 Post-Launch Monitoring

**First 24 Hours:**

- [ ] Monitor for review status change
- [ ] Check for any rejection emails
- [ ] Prepare to respond quickly to feedback

**First Week:**

- [ ] Monitor crash reports daily
- [ ] Respond to all reviews within 24 hours
- [ ] Track download numbers
- [ ] Check for permission-related complaints

**Ongoing:**

- [ ] Weekly crash report review
- [ ] Monthly update cycle
- [ ] User feedback analysis
- [ ] Performance optimization

---

## 🎉 After Approval

1. **Announce the launch** 🎊
2. **Monitor reviews** and respond promptly
3. **Plan first update** based on feedback
4. **Collect user testimonials**
5. **Iterate and improve**

---

**Remember:** The first submission is the hardest. After approval, updates are much faster!

**Good luck! 🚀**
