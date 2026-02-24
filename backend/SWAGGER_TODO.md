# Swagger Annotation Checklist

Each item needs `@ApiTags` + `@ApiBearerAuth` (if auth-guarded) on the controller,
`@ApiOperation` on every endpoint, and `@ApiProperty` / `@ApiPropertyOptional` on every DTO field.

Legend: ✅ Done | ⬜ Pending | 🔸 Partial (some decorators already exist)

---

## 1. Auth

### Controllers

| Status | File                                 |
| ------ | ------------------------------------ |
| ✅     | `src/auth/auth.controller.ts`        |
| ✅     | `src/auth/rider-auth.controller.ts`  |
| ✅     | `src/auth/vendor-auth.controller.ts` |

### DTOs

| Status | File                                  |
| ------ | ------------------------------------- |
| ✅     | `src/auth/dto/create-user.dto.ts`     |
| ✅     | `src/auth/dto/create-vendor.dto.ts`   |
| ✅     | `src/auth/dto/create-rider.dto.ts`    |
| ✅     | `src/auth/dto/create-driver.dto.ts`   |
| ✅     | `src/auth/dto/login-vendor.dto.ts`    |
| ✅     | `src/auth/dto/forgot-password.dto.ts` |
| ✅     | `src/auth/dto/reset-password.dto.ts`  |
| ✅     | `src/auth/dto/update-profile.dto.ts`  |
| ✅     | `src/auth/dto/google-oauth.dto.ts`    |
| ✅     | `src/auth/dto/apple-oauth.dto.ts`     |

---

## 2. Users

### Controllers

| Status | File                                  |
| ------ | ------------------------------------- |
| ✅     | `src/users/users.controller.ts`       |
| ✅     | `src/users/trips/trips.controller.ts` |

### DTOs

| Status | File                                     |
| ------ | ---------------------------------------- |
| ✅     | `src/users/dto/users.dto.ts`             |
| ✅     | `src/users/dto/emergency-contact.dto.ts` |
| ✅     | `src/users/trips/dto/trip.dto.ts`        |

---

## 3. Riders

### Controllers

| Status | File                                                 |
| ------ | ---------------------------------------------------- |
| ✅     | `src/riders/profile/profile.controller.ts`           |
| ✅     | `src/riders/status/status.controller.ts`             |
| ✅     | `src/riders/bank/bank.controller.ts`                 |
| ✅     | `src/riders/withdrawal/withdrawal.controller.ts`     |
| ✅     | `src/riders/order/order.controller.ts`               |
| ✅     | `src/riders/jobs/jobs.controller.ts`                 |
| ✅     | `src/riders/notification/notification.controller.ts` |
| ✅     | `src/riders/rider-notifications.controller.ts`       |

### DTOs

| Status | File                                                 |
| ------ | ---------------------------------------------------- |
| ✅     | `src/riders/dto/update-personal-info.dto.ts`         |
| ✅     | `src/riders/dto/update-status.dto.ts`                |
| ✅     | `src/riders/dto/update-bank-account.dto.ts`          |
| ✅     | `src/riders/dto/create-withdrawal.dto.ts`            |
| ✅     | `src/riders/dto/accept-delivery.dto.ts`              |
| ✅     | `src/riders/dto/complete-delivery.dto.ts`            |
| ✅     | `src/riders/dto/update-notification-settings.dto.ts` |

---

## 4. Vendor

### Controllers

| Status | File                                                          |
| ------ | ------------------------------------------------------------- |
| ✅     | `src/vendor/vendor.controller.ts`                             |
| ✅     | `src/vendor/products/products.controller.ts`                  |
| ✅     | `src/vendor/orders/vendor-orders.controller.ts`               |
| ✅     | `src/vendor/notifications/vendor-notifications.controller.ts` |

### DTOs

| Status | File                            |
| ------ | ------------------------------- |
| ✅     | `src/vendor/dto/product.dto.ts` |

---

## 5. Marketplace

### Controllers

| Status | File                                        |
| ------ | ------------------------------------------- |
| ⬜     | `src/marketplace/marketplace.controller.ts` |

### DTOs

| Status | File                                       |
| ------ | ------------------------------------------ |
| ⬜     | `src/marketplace/dto/create-review.dto.ts` |

---

## 6. Fare

### Controllers

| Status | File                          |
| ------ | ----------------------------- |
| ⬜     | `src/fare/fare.controller.ts` |

### DTOs

| Status | File                                |
| ------ | ----------------------------------- |
| ⬜     | `src/fare/dto/ride-fare-dto.ts`     |
| ⬜     | `src/fare/dto/delivery-fare-dto.ts` |

---

## 7. Payment

### Controllers

| Status | File                                |
| ------ | ----------------------------------- |
| ⬜     | `src/payment/payment.controller.ts` |

### DTOs

| Status | File                             |
| ------ | -------------------------------- |
| ⬜     | `src/payment/dto/payment.dto.ts` |

---

## 8. Cart

### Controllers

| Status | File                          |
| ------ | ----------------------------- |
| ⬜     | `src/cart/cart.controller.ts` |

### DTOs

| Status | File                               |
| ------ | ---------------------------------- |
| ⬜     | `src/cart/dto/add-to-cart.dto.ts`  |
| ⬜     | `src/cart/dto/cart-summary.dto.ts` |

---

## 9. Notifications

### Controllers

| Status | File                                            |
| ------ | ----------------------------------------------- |
| ⬜     | `src/notifications/notifications.controller.ts` |

---

## 10. Maps

### Controllers

| Status | File                          |
| ------ | ----------------------------- |
| ⬜     | `src/maps/maps.controller.ts` |

### DTOs

| Status | File                                 |
| ------ | ------------------------------------ |
| ⬜     | `src/maps/dto/address-search.dto.ts` |
| ⬜     | `src/maps/dto/directions.dto.ts`     |

---

## 11. Products

### Controllers

| Status | File                                    |
| ------ | --------------------------------------- |
| ⬜     | `src/products/categories.controller.ts` |

---

## 12. Support

### Controllers

| Status | File                                |
| ------ | ----------------------------------- |
| ⬜     | `src/support/support.controller.ts` |

### DTOs

| Status | File                                     |
| ------ | ---------------------------------------- |
| ⬜     | `src/support/dto/support-inquiry.dto.ts` |

---

## 13. Storage

### Controllers

| Status | File                                |
| ------ | ----------------------------------- |
| ⬜     | `src/storage/storage.controller.ts` |

---

## 14. Logs

### Controllers

| Status | File                          |
| ------ | ----------------------------- |
| ⬜     | `src/logs/logs.controller.ts` |

### DTOs

| Status | File                                   |
| ------ | -------------------------------------- |
| ⬜     | `src/logs/dto/create-error-log.dto.ts` |

---

## 15. Jobs (root)

### Controllers

| Status | File                          |
| ------ | ----------------------------- |
| ⬜     | `src/jobs/jobs.controller.ts` |

---

## 16. Matching

### DTOs

| Status | File                               |
| ------ | ---------------------------------- |
| ⬜     | `src/matching/dto/matching.dto.ts` |

---

## 17. Super-Admin

### Controllers

| Status | File                                                                  |
| ------ | --------------------------------------------------------------------- |
| ⬜     | `src/super-admin/admins/admins.controller.ts`                         |
| ⬜     | `src/super-admin/banners/banner.controller.ts`                        |
| ⬜     | `src/super-admin/customers/customers.controller.ts`                   |
| ⬜     | `src/super-admin/dashboard/dashboard.controller.ts`                   |
| ⬜     | `src/super-admin/deliveries/deliveries.controller.ts`                 |
| 🔸     | `src/super-admin/dispute/dispute.controller.ts` _(has @ApiTags only)_ |
| ⬜     | `src/super-admin/maps/maps.controller.ts`                             |
| ⬜     | `src/super-admin/notifications/notifications.controller.ts`           |
| ⬜     | `src/super-admin/orders/orders.controller.ts`                         |
| ⬜     | `src/super-admin/payouts/payouts.controller.ts`                       |
| ⬜     | `src/super-admin/reports/reports.controller.ts`                       |
| ⬜     | `src/super-admin/ride/ride.controller.ts`                             |
| ⬜     | `src/super-admin/riders/rider.controller.ts`                          |
| ⬜     | `src/super-admin/riders/drivers.controller.ts`                        |
| ⬜     | `src/super-admin/settings/settings.controller.ts`                     |
| ⬜     | `src/super-admin/transactions/transaction.controller.ts`              |
| ⬜     | `src/super-admin/vendors/vendor.controller.ts`                        |
| ⬜     | `src/super-admin/vendors/activity.controller.ts`                      |
| ⬜     | `src/super-admin/vendors/documents.controller.ts`                     |
| ⬜     | `src/super-admin/vendors/orders.controller.ts`                        |
| ⬜     | `src/super-admin/vendors/reviews.controller.ts`                       |
| ⬜     | `src/super-admin/verification/verification.controller.ts`             |
| ⬜     | `src/super-admin/zones/zones.controller.ts`                           |
| ⬜     | `src/super-admin/activity-logs/activity-log.controller.ts`            |

### DTOs

| Status | File                                                                       |
| ------ | -------------------------------------------------------------------------- |
| ⬜     | `src/super-admin/admins/dto/create-admins.dto.ts`                          |
| ⬜     | `src/super-admin/banners/dto/create-banner.dto.ts`                         |
| ⬜     | `src/super-admin/deliveries/dto/delivery-filter.dto.ts`                    |
| ⬜     | `src/super-admin/dispute/dto/create-dispute.dto.ts`                        |
| ⬜     | `src/super-admin/dispute/dto/add-message.dto.ts`                           |
| ⬜     | `src/super-admin/dispute/dto/filter-disputes.dto.ts`                       |
| 🔸     | `src/super-admin/dispute/dto/resolve-dispute.dto.ts` _(has @ApiProperty)_  |
| ⬜     | `src/super-admin/dispute/dto/update-priority.dto.ts`                       |
| ⬜     | `src/super-admin/orders/dto/order-filter.dto.ts`                           |
| 🔸     | `src/super-admin/reports/dto/get-analytics.dto.ts` _(has @ApiProperty)_    |
| 🔸     | `src/super-admin/reports/dto/export-analytics.dto.ts` _(has @ApiProperty)_ |
| ⬜     | `src/super-admin/ride/dto/ride-filter.dto.ts`                              |
| ⬜     | `src/super-admin/transactions/dto/transaction-filter.dto.ts`               |
| ⬜     | `src/super-admin/transactions/dto/adjust-wallet.dto.ts`                    |
| ⬜     | `src/super-admin/vendors/dto/vendor.dto.ts`                                |
| ⬜     | `src/super-admin/verification/dto/verify-document.dto.ts`                  |
| ⬜     | `src/super-admin/zones/dto/create-zone.dto.ts`                             |

---

## 18. App & System (low priority — internal)

| Status | File                                 | Note             |
| ------ | ------------------------------------ | ---------------- |
| ⬜     | `src/app.controller.ts`              | health endpoints |
| ⬜     | `src/system/bullboard.controller.ts` | admin only       |

---

## Summary

| Category      | Controllers | DTOs   |
| ------------- | ----------- | ------ |
| Auth          | 3           | 10     |
| Users ✅      | 2           | 3      |
| Riders ✅     | 8           | 7      |
| Vendor ✅     | 4           | 1      |
| Marketplace   | 1           | 1      |
| Fare          | 1           | 2      |
| Payment       | 1           | 1      |
| Cart          | 1           | 2      |
| Notifications | 1           | —      |
| Maps          | 1           | 2      |
| Products      | 1           | —      |
| Support       | 1           | 1      |
| Storage       | 1           | —      |
| Logs          | 1           | 1      |
| Jobs          | 1           | —      |
| Matching      | —           | 1      |
| Super-Admin   | 24          | 17     |
| App/System    | 2           | —      |
| **Total**     | **54**      | **49** |

---

## Suggested Order

Work from highest-traffic / most visible to internal:

1. **Auth** (login, register — everyone hits these)
2. **Users + Trips**
3. **Riders** (profile → status → bank → withdrawal → order)
4. **Vendor** (vendor → products → orders)
5. **Marketplace + Fare + Payment + Cart**
6. **Notifications + Maps + Support + Storage**
7. **Super-Admin** (dashboard → orders → customers → riders → vendors → dispute → rest)
8. **App/System** (health, bull board)
