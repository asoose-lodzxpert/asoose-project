# Monnify Webhook Configuration Guide

## Overview

Monnify requires different webhook URLs for different event types. Configure these in your Monnify Dashboard.

---

## 🔗 Webhook URLs

### Development (Local)

```
Base URL: http://localhost:3000/api/v1
```

### Production

```
Base URL: https://your-production-domain.com/api/v1
```

---

## 📋 Webhook Endpoints

### 1. **Transaction Completion Webhook** ✅ IMPLEMENTED

**Purpose**: Notifies when a customer completes a payment

**URL**:

- Dev: `http://localhost:3000/api/v1/payment/webhook/monnify/transaction`
- Prod: `https://your-domain.com/api/v1/payment/webhook/monnify/transaction`

**Event Type**: `SUCCESSFUL_TRANSACTION`

**Payload Example**:

```json
{
  "eventType": "SUCCESSFUL_TRANSACTION",
  "eventData": {
    "transactionReference": "MNFY|20231201120000|000001",
    "paymentReference": "PAY-1701432000-ABC123",
    "amountPaid": 5000.0,
    "totalPayable": 5000.0,
    "paidOn": "2023-12-01T12:00:00",
    "paymentStatus": "PAID",
    "paymentMethod": "ACCOUNT_TRANSFER",
    "currency": "NGN",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe"
  }
}
```

**What it does**:

- Updates payment status to SUCCESS
- Confirms the order
- Sends notifications to customer and vendor
- Triggers delivery/ride matching if applicable

---

### 2. **Refund Completion Webhook** ✅ IMPLEMENTED

**Purpose**: Notifies when a refund is successfully processed

**URL**:

- Dev: `http://localhost:3000/api/v1/payment/webhook/monnify/refund`
- Prod: `https://your-domain.com/api/v1/payment/webhook/monnify/refund`

**Event Type**: `SUCCESSFUL_REFUND`

**Payload Example**:

```json
{
  "eventType": "SUCCESSFUL_REFUND",
  "eventData": {
    "transactionReference": "MNFY|20231201120000|000001",
    "refundReference": "REF-1701432000-XYZ789",
    "refundAmount": 5000.0,
    "refundStatus": "COMPLETED",
    "destinationAccountNumber": "1234567890",
    "destinationBankCode": "058",
    "completedOn": "2023-12-01T14:00:00"
  }
}
```

**What it does**:

- Updates payment status to REFUNDED
- Stores refund details in payment metadata
- Sends refund success notification to customer

---

### 3. **Disbursement Webhook** ⚠️ TODO

**Purpose**: Notifies when a payout to vendor/rider is completed

**URL**:

- Dev: `http://localhost:3000/api/v1/payment/webhook/monnify/disbursement`
- Prod: `https://your-domain.com/api/v1/payment/webhook/monnify/disbursement`

**Event Type**: `SUCCESSFUL_DISBURSEMENT`

**Payload Example**:

```json
{
  "eventType": "SUCCESSFUL_DISBURSEMENT",
  "eventData": {
    "reference": "DISB-1701432000-ABC123",
    "amount": 10000.0,
    "destinationAccountNumber": "9876543210",
    "destinationBankCode": "044",
    "narration": "Payout for sales",
    "status": "SUCCESSFUL",
    "completedOn": "2023-12-01T15:00:00"
  }
}
```

**TODO**: Implement handler to:

- Update VendorPayout or RiderPayout status
- Update wallet balance
- Send payout success notification

---

### 4. **Settlement Webhook** ⚠️ TODO

**Purpose**: Notifies when Monnify settles funds to your account

**URL**:

- Dev: `http://localhost:3000/api/v1/payment/webhook/monnify/settlement`
- Prod: `https://your-domain.com/api/v1/payment/webhook/monnify/settlement`

**Event Type**: `SETTLEMENT_COMPLETED`

**Payload Example**:

```json
{
  "eventType": "SETTLEMENT_COMPLETED",
  "eventData": {
    "settlementReference": "SETT-1701432000-ABC123",
    "amount": 95000.0,
    "settlementDate": "2023-12-01",
    "transactionCount": 20,
    "accountNumber": "1234567890",
    "bankCode": "058"
  }
}
```

**TODO**: Implement handler to:

- Record settlement in database
- Reconcile with transactions
- Send settlement report notification

---

### 5. **Mandate Webhook** ⚠️ TODO

**Purpose**: Notifies about recurring payment mandate status

**URL**:

- Dev: `http://localhost:3000/api/v1/payment/webhook/monnify/mandate`
- Prod: `https://your-domain.com/api/v1/payment/webhook/monnify/mandate`

**Event Type**: `MANDATE_ACTIVATED` | `MANDATE_DEACTIVATED` | `MANDATE_PAYMENT_SUCCESSFUL`

**Payload Example**:

```json
{
  "eventType": "MANDATE_ACTIVATED",
  "eventData": {
    "mandateReference": "MAN-1701432000-ABC123",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "accountNumber": "1234567890",
    "bankCode": "058",
    "maxAmountPerDebit": 50000.0,
    "activatedOn": "2023-12-01T12:00:00"
  }
}
```

**TODO**: Implement handler for subscription/recurring payments

---

### 6. **Wallet Activity Notification** ⚠️ TODO

**Purpose**: Notifies about wallet transactions (if using Monnify wallet)

**URL**:

- Dev: `http://localhost:3000/api/v1/payment/webhook/monnify/wallet-activity`
- Prod: `https://your-domain.com/api/v1/payment/webhook/monnify/wallet-activity`

**Event Type**: `WALLET_CREDIT` | `WALLET_DEBIT`

**Payload Example**:

```json
{
  "eventType": "WALLET_CREDIT",
  "eventData": {
    "walletReference": "WALLET-1701432000-ABC123",
    "amount": 100000.0,
    "balanceBefore": 500000.0,
    "balanceAfter": 600000.0,
    "narration": "Wallet top-up",
    "transactionDate": "2023-12-01T12:00:00"
  }
}
```

**TODO**: Implement handler for wallet management

---

### 7. **Low Balance Notification** ⚠️ TODO

**Purpose**: Alerts when account balance is low

**URL**:

- Dev: `http://localhost:3000/api/v1/payment/webhook/monnify/low-balance`
- Prod: `https://your-domain.com/api/v1/payment/webhook/monnify/low-balance`

**Event Type**: `LOW_BALANCE_ALERT`

**Payload Example**:

```json
{
  "eventType": "LOW_BALANCE_ALERT",
  "eventData": {
    "currentBalance": 5000.0,
    "threshold": 10000.0,
    "accountNumber": "1234567890",
    "bankCode": "058",
    "alertDate": "2023-12-01T12:00:00"
  }
}
```

**TODO**: Implement handler to:

- Send alert to admin
- Log low balance event
- Trigger auto top-up if configured

---

## 🔐 Webhook Security

All webhooks verify the `monnify-signature` header to ensure authenticity.

```typescript
// Verification is done automatically in the controller
@Headers('monnify-signature') signature: string
```

The signature is a SHA-512 HMAC of the payload using your Monnify Secret Key.

---

## 📝 Configuration Steps

### 1. Add BACKEND_URL to .env

```env
BACKEND_URL=http://localhost:3000  # Development
# BACKEND_URL=https://api.yourdomain.com  # Production
```

### 2. Configure Webhooks in Monnify Dashboard

1. Login to [Monnify Dashboard](https://app.monnify.com)
2. Go to **Settings** → **Webhooks**
3. Add the webhook URLs for each event type:
   - Transaction Completion: `https://your-domain.com/api/v1/payment/webhook/monnify/transaction`
   - Refund Completion: `https://your-domain.com/api/v1/payment/webhook/monnify/refund`
   - Disbursement: `https://your-domain.com/api/v1/payment/webhook/monnify/disbursement`
   - Settlement: `https://your-domain.com/api/v1/payment/webhook/monnify/settlement`
   - Mandate: `https://your-domain.com/api/v1/payment/webhook/monnify/mandate`
   - Wallet Activity: `https://your-domain.com/api/v1/payment/webhook/monnify/wallet-activity`
   - Low Balance: `https://your-domain.com/api/v1/payment/webhook/monnify/low-balance`

### 3. Test Webhooks

- Use Monnify's test environment to verify webhook delivery
- Check backend logs for webhook events
- Verify database updates after webhook processing

---

## 🧪 Testing

### Using Postman or cURL

```bash
# Test Transaction Webhook
curl -X POST http://localhost:3000/api/v1/payment/webhook/monnify/transaction \
  -H "Content-Type: application/json" \
  -H "monnify-signature: your-signature-hash" \
  -d '{
    "eventType": "SUCCESSFUL_TRANSACTION",
    "eventData": {
      "transactionReference": "MNFY|TEST|000001",
      "paymentReference": "PAY-TEST-123",
      "amountPaid": 5000.00,
      "paidOn": "2024-01-19T12:00:00"
    }
  }'
```

---

## 📊 Implementation Status

| Webhook Type           | Status         | Priority |
| ---------------------- | -------------- | -------- |
| Transaction Completion | ✅ Implemented | High     |
| Refund Completion      | ✅ Implemented | High     |
| Disbursement           | ⚠️ TODO        | Medium   |
| Settlement             | ⚠️ TODO        | Low      |
| Mandate                | ⚠️ TODO        | Low      |
| Wallet Activity        | ⚠️ TODO        | Low      |
| Low Balance            | ⚠️ TODO        | Low      |

---

## 🔍 Monitoring

Check webhook logs in your application:

```bash
# View logs
docker logs -f asoose-backend

# Search for Monnify webhooks
docker logs asoose-backend | grep "Monnify"
```

---

## 🚨 Important Notes

1. **Always use HTTPS in production** - Webhooks with HTTP will be rejected
2. **Verify signatures** - Never trust webhook data without verification
3. **Handle idempotency** - Same webhook may be sent multiple times
4. **Log everything** - Keep detailed logs for debugging and reconciliation
5. **Test thoroughly** - Use sandbox environment before going live

---

## 📞 Support

If you encounter issues:

- Check Monnify Dashboard webhook logs
- Review backend application logs
- Contact Monnify support: support@monnify.com
- Check Monnify API docs: https://docs.monnify.com
