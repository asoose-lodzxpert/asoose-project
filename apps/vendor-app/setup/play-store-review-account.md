# Play Store Reviewer Test Account Setup

## Purpose
This file documents the requirements and setup for a Google Play Store reviewer test account, ensuring reviewers can access all core features of the ASOOSE Vendor App without being blocked by authentication or account status.

---

## Reviewer Access Requirements
- **Login Required:** The app is fully gated behind authentication. Reviewers must log in to access any features.
- **Account Status:** Only accounts with status `ACTIVE` can access main app features. Other statuses (PENDING, SUSPENDED, BANNED, CLOSED_PERMANENTLY) will redirect to status screens and block access.
- **Sample Data:** The test account should have demo store, products, and orders for meaningful review.

---

## Test Account Setup
1. **Create a vendor account in your backend:**
    - Email: `test@example.com` (or similar)
    - Password: `securetestpassword`
    - Status: `ACTIVE`
    - Store, products, and orders populated for demo

2. **Provide credentials in Play Console submission:**
    - Email: `test@example.com`
    - Password: `securetestpassword`

3. **Instructions for reviewers:**
    - Log in with the provided credentials
    - Explore all main features (store management, product upload, order handling, etc.)
    - If needed, test other account statuses by changing the test account status in backend and re-login

---

## Security Note
- No code changes are required to bypass authentication or weaken security.
- Reviewer access is controlled by backend account setup.

---

## Example Submission Text
```
Test Account Email: test@example.com
Test Account Password: securetestpassword

This account is pre-populated with demo store, products, and orders. Status is set to ACTIVE for full feature access. If you need to test other account states, please contact support or change the status in backend.
```

---

## Contact
For any issues with reviewer access, contact the app support team or backend administrator.
