# Payment Module Documentation

This module provides integrated payment processing with three payment gateways: **Paystack**, **Flutterwave**, and **Monnify**.

## Features

- ✅ **Multiple Payment Gateways**: Paystack, Flutterwave, and Monnify
- ✅ **Bank Transfer Support**: Monnify generates temporary virtual accounts
- ✅ **Webhook Processing**: Automatic payment verification and order updates
- ✅ **Notifications**: Sends notifications to customers and vendors on payment events
- ✅ **Secure Signature Verification**: Validates webhook authenticity
- ✅ **Payment Methods**: Card, Bank Transfer, USSD, Mobile Money

## Environment Variables

Add these to your `.env` file:

```env
# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx

# Flutterwave
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxx

# Monnify (for Bank Transfer)
MONNIFY_BASE_URL=https://sandbox.monnify.com
MONNIFY_API_KEY=your-api-key
MONNIFY_SECRET_KEY=your-secret-key
MONNIFY_CONTRACT_CODE=your-contract-code

# Backend URL (for webhooks)
BACKEND_URL=http://localhost:3000
```

## API Endpoints

### 1. Initialize Payment

```http
POST /payment/initialize
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 5000,
  "email": "customer@example.com",
  "customerName": "John Doe",
  "phoneNumber": "08012345678",
  "gateway": "PAYSTACK",
  "method": "CARD",
  "orderId": "order-uuid",
  "callbackUrl": "https://yourapp.com/payment/callback",
  "metadata": {
    "custom_field": "value"
  }
}
```

**Response (Paystack/Flutterwave):**
```json
{
  "reference": "PAY-1234567890-ABC123",
  "authorizationUrl": "https://checkout.paystack.com/...",
  "accessCode": "abc123xyz",
  "amount": 5000
}
```

**Response (Monnify - Bank Transfer):**
```json
{
  "reference": "PAY-1234567890-ABC123",
  "accountNumber": "1234567890",
  "bankName": "Wema Bank",
  "accountName": "MONNIFY/ASOOSE",
  "amount": 5000,
  "expiresAt": "2026-01-13T12:00:00Z"
}
```

### 2. Verify Payment

```http
GET /payment/verify?reference=PAY-1234567890-ABC123&gateway=PAYSTACK
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "reference": "PAY-1234567890-ABC123",
  "amount": 5000,
  "status": "SUCCESS",
  "gateway": "PAYSTACK",
  "paidAt": "2026-01-12T10:30:00Z"
}
```

### 3. Webhooks (Payment Provider → Backend)

#### Paystack Webhook
```http
POST /payment/webhook/paystack
x-paystack-signature: {signature}
```

#### Flutterwave Webhook
```http
POST /payment/webhook/flutterwave
verif-hash: {signature}
```

#### Monnify Webhook
```http
POST /payment/webhook/monnify
monnify-signature: {signature}
```

### 4. Payment Callbacks (Redirects)

After successful payment, users are redirected to:

```
GET /payment/webhook/paystack/callback?reference=PAY-XXX
GET /payment/webhook/flutterwave/callback?tx_ref=PAY-XXX&transaction_id=123
GET /payment/webhook/monnify/callback?paymentReference=PAY-XXX
```

These endpoints verify the payment and redirect to frontend:
```
{CUSTOMER_WEB_URL}/payment/callback?reference=PAY-XXX&status=SUCCESS
```

## Payment Flow

### Card Payment (Paystack/Flutterwave)

1. Customer initiates payment
2. Backend creates payment record with `PENDING` status
3. Backend calls payment gateway to initialize transaction
4. Customer is redirected to payment gateway checkout page
5. Customer enters card details and completes payment
6. Payment gateway sends webhook to backend
7. Backend verifies webhook signature
8. Backend updates payment status to `SUCCESS`
9. Backend updates order status to `CONFIRMED`
10. Backend sends notifications to customer and vendor
11. Customer is redirected back to app

### Bank Transfer (Monnify)

1. Customer selects bank transfer payment method
2. Backend creates payment record with `PENDING` status
3. Backend calls Monnify to create virtual account
4. Customer receives temporary bank account details
5. Customer transfers money to the account
6. Monnify detects payment and sends webhook
7. Backend verifies webhook and updates payment status
8. Backend updates order status to `CONFIRMED`
9. Backend sends notifications to customer and vendor

## Webhook Configuration

Configure these webhook URLs in your payment provider dashboards:

### Paystack
Dashboard: https://dashboard.paystack.com
- Settings → Webhooks
- URL: `https://yourdomain.com/payment/webhook/paystack`

### Flutterwave
Dashboard: https://dashboard.flutterwave.com
- Settings → Webhooks
- URL: `https://yourdomain.com/payment/webhook/flutterwave`

### Monnify
Dashboard: https://app.monnify.com
- Settings → Webhooks
- URL: `https://yourdomain.com/payment/webhook/monnify`

## Notifications

The payment module automatically sends notifications on payment events:

### Customer Notifications
- **Payment Successful**: "Your payment of ₦5,000 was successful. Your order is being processed."
- Type: `PAYMENT_SUCCESS`

### Vendor Notifications
- **New Order Payment**: "Payment received for order #123. Amount: ₦5,000"
- Type: `ORDER_PAYMENT`

## Payment Gateways Comparison

| Feature | Paystack | Flutterwave | Monnify |
|---------|----------|-------------|---------|
| Card Payment | ✅ | ✅ | ❌ |
| Bank Transfer | ❌ | ❌ | ✅ |
| USSD | ✅ | ✅ | ❌ |
| Mobile Money | ❌ | ✅ | ❌ |
| Virtual Accounts | ❌ | ❌ | ✅ |
| Transaction Fee | 1.5% + ₦100 | 1.4% | Varies |

## Security

- ✅ Webhook signature verification for all gateways
- ✅ HMAC SHA-512 (Paystack, Monnify)
- ✅ HMAC SHA-256 (Flutterwave)
- ✅ JWT authentication for API endpoints
- ✅ Payment status validation before order confirmation

## Testing

### Test Cards

**Paystack:**
- Success: `4084084084084081`
- Decline: `5061020000000000`
- Insufficient Funds: `5060666666666666`

**Flutterwave:**
- Success: `5531886652142950`
- PIN: `3310`
- OTP: `12345`

**Monnify:**
- Use sandbox account for testing
- Transfer any amount to generated account

### Test Credentials

Get test credentials from:
- Paystack: https://dashboard.paystack.com/#/settings/developer
- Flutterwave: https://dashboard.flutterwave.com/dashboard/settings/apis
- Monnify: https://app.monnify.com/merchant

## Error Handling

All payment errors are logged and payment status is updated to `FAILED`:

```typescript
try {
  await paymentService.initiatePayment(dto);
} catch (error) {
  // Payment record updated to FAILED
  // Original error message preserved
  throw error;
}
```

## Database Schema

```prisma
model Payment {
  id                  String        @id @default(uuid())
  reference           String        @unique
  gateway             String        // PAYSTACK, FLUTTERWAVE, MONNIFY
  amount              Float
  status              PaymentStatus @default(PENDING)
  method              PaymentMethod
  
  // Gateway specific fields
  authorizationUrl    String?       // For card payments
  accountNumber       String?       // For bank transfer
  bankName            String?
  accountName         String?
  expiresAt           DateTime?
  
  // Verification
  paidAt              DateTime?
  verifiedAt          DateTime?
  
  // Relations
  orderId             String?       @unique
  userId              String
  order               Order?
  user                User
  
  @@index([reference])
  @@index([gateway, status])
}
```

## Production Checklist

- [ ] Replace test API keys with production keys
- [ ] Update `MONNIFY_BASE_URL` to production URL
- [ ] Configure webhook URLs in payment provider dashboards
- [ ] Set up proper logging and monitoring
- [ ] Enable SSL/HTTPS for webhook endpoints
- [ ] Test webhook signature verification
- [ ] Set up payment reconciliation process
- [ ] Configure proper error notifications
- [ ] Test all payment flows end-to-end

## Support

For issues or questions:
- Check payment gateway documentation
- Review webhook logs in provider dashboard
- Check application logs for errors
- Verify webhook signatures are valid
