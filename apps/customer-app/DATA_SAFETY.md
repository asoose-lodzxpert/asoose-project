# Play Console Data Safety Mapping

| Data Type               | Collected | Purpose(s)               | Shared with 3rd Parties | Encrypted in Transit | Encrypted at Rest | User Control/Optional  | Notes/Reviewer Clarity                |
| ----------------------- | --------- | ------------------------ | ----------------------- | -------------------- | ----------------- | ---------------------- | ------------------------------------- |
| Name, Email, Phone      | Yes       | Account creation, login  | No                      | Yes                  | Yes (SecureStore) | Yes (user can delete)  | Collected at signup/login             |
| Location (Precise)      | Yes       | Ride/delivery, address   | No                      | Yes                  | No                | Yes (permission)       | Only with user permission, not in bg  |
| Payment Info            | No\*      | -                        | -                       | -                    | -                 | -                      | Payment handled via webview/3rd party |
| Device/App Info         | Yes       | Push notifications       | No                      | Yes                  | No                | Yes (user can opt out) | Expo push token only                  |
| Photos/Media/Files      | Yes       | Profile, delivery images | No                      | Yes                  | No                | Yes (permission)       | Only via user-initiated picker        |
| Authentication Tokens   | Yes       | Session management       | No                      | Yes                  | Yes (SecureStore) | Yes (logout)           | Never shared, encrypted at rest       |
| Biometric Data          | No        | -                        | -                       | -                    | -                 | -                      | Only used for local device auth       |
| Contacts, SMS, Calendar | No        | -                        | -                       | -                    | -                 | -                      | Not accessed                          |
| Health, Fitness, Audio  | No        | -                        | -                       | -                    | -                 | -                      | Not accessed                          |
| Crash Logs/Analytics    | No        | -                        | -                       | -                    | -                 | -                      | No analytics SDK present              |

---

## Reviewer Notes

- **Location**: Only collected with explicit user permission, never in background, not shared.
- **Personal Info**: Used for account and ride/delivery only, not shared or sold.
- **Push Token**: Used for notifications, not shared with 3rd parties.
- **Photos/Media**: Only accessed when user picks or uploads, not scanned in background.
- **Authentication**: All tokens are encrypted at rest (expo-secure-store).
- **No background location**: Confirmed by codebase and config.
- **No analytics, crash reporting, or advertising SDKs**.
- **User controls**: Users can delete their account and data, opt out of notifications, and revoke permissions at any time.

---

_If you add analytics, payments, or other features in the future, update this mapping accordingly._
