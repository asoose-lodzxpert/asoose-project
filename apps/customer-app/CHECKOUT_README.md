# Checkout Feature - Installation & Setup Guide

## Overview

The checkout feature provides a complete order placement flow including:

- Product review
- Address selection
- Payment method selection
- Payment processing via WebView
- Success confirmation

## Installation

### 1. Install Dependencies

```bash
cd apps/customer-app
npx expo install react-native-webview
```

### 2. Files Created

The following files have been created for the checkout feature:

#### Main Screen

- `app/checkout.tsx` - Main checkout screen

#### Components

- `components/checkout/AddressSelectionModal.tsx` - Address selection modal
- `components/checkout/PaymentMethodModal.tsx` - Payment method selection modal
- `components/checkout/PaymentWebView.tsx` - WebView for payment authorization
- `components/checkout/PaymentSuccessModal.tsx` - Success confirmation modal

#### Services

- `services/order.service.ts` - Order creation and management API calls

## Features

### 1. Product Review

- Displays all items in cart
- Shows store information
- Item quantities and prices

### 2. Address Selection

- Fetches user's saved addresses
- Allows selection of delivery address
- Shows default address badge
- Option to add new address

### 3. Payment Method Selection

Supports multiple payment gateways:

- **Paystack** - Card payments
- **Flutterwave** - Card payments
- **Monnify** - Bank transfer
- **Direct Bank Transfer**

### 4. Price Breakdown

- Subtotal
- Delivery fee
- Total amount

### 5. Payment Processing

- WebView integration for card payments
- Automatic payment verification
- Status polling
- Success/failure handling

### 6. Success Confirmation

- Payment success modal
- Order ID display
- Amount confirmation
- Navigation to orders or home

## Usage Flow

1. User navigates from cart to checkout
2. Reviews order items and store info
3. Selects delivery address from saved addresses
4. Chooses payment method
5. Places order (creates order in backend)
6. For card payments: Opens WebView with payment gateway
7. Completes payment in WebView
8. Payment is verified automatically
9. Success modal is displayed
10. Cart is cleared
11. User can view order or return to home

## Backend Requirements

### API Endpoints Required

#### 1. Get User Addresses

```
GET /users/addresses
Response: {
  addresses: Address[]
}
```

#### 2. Create Order

```
POST /marketplace/orders
Body: {
  storeId: string
  deliveryAddressId: string
  items: { productId: string, quantity: number }[]
}
Response: {
  id: string
  storeId: string
  userId: string
  status: string
  total: number
  deliveryFee: number
  subtotal: number
  createdAt: string
  items: OrderItem[]
}
```

#### 3. Initialize Payment

```
POST /payment/initialize
Body: {
  amount: number
  email: string
  customerName: string
  phoneNumber?: string
  gateway: "PAYSTACK" | "FLUTTERWAVE" | "MONNIFY"
  method: "CARD" | "BANK_TRANSFER"
  type: "ORDER"
  orderId: string
  callbackUrl?: string
  metadata?: object
}
Response: {
  reference: string
  authorizationUrl: string
  accessCode?: string
  accountNumber?: string
  bankName?: string
  accountName?: string
  expiresAt?: string
}
```

#### 4. Verify Payment

```
GET /payment/verify?reference={reference}
Response: {
  success: boolean
  status: "SUCCESS" | "FAILED" | "PENDING"
  amount: number
  reference: string
}
```

## Payment Gateway Callback URLs

The payment authorization URL should redirect to:

- Success: `myapp://checkout/success`
- Cancel: `myapp://checkout/cancel`

These URLs are handled by the WebView component's navigation listener.

## Customization

### Theme Colors

All colors are pulled from the theme system using `useThemeColor`:

- `brandPrimary` - Accent color
- `surfaceBackground` - Main background
- `surfaceCard` - Card backgrounds
- `surfaceSubtle` - Subtle backgrounds
- `textPrimary` - Primary text
- `textSecondary` - Secondary text
- `borderDefault` - Borders
- `statusSuccess` - Success states
- `statusError` - Error states

### Currency Symbol

The currency symbol is pulled from the restaurant/store data and defaults to "₦".

### Payment Methods

To add/remove payment methods, edit the `paymentMethods` array in `PaymentMethodModal.tsx`.

## Testing

### Test Flow

1. Add items to cart from a store
2. Navigate to cart
3. Click "Proceed to Checkout"
4. Select an address (you may need to add one first)
5. Select payment method
6. Click "Place Order"
7. Complete payment in WebView
8. Verify success modal appears
9. Check that cart is cleared

### Test Data Needed

- At least one saved address for the user
- Products in a store
- Working payment gateway credentials

## Troubleshooting

### WebView not displaying

- Ensure `react-native-webview` is installed: `npx expo install react-native-webview`
- Check that the payment URL is valid (HTTPS)

### Payment verification fails

- Check backend payment verification endpoint
- Ensure reference is correctly passed
- Check network logs for API errors

### Address modal empty

- Ensure user has saved addresses
- Check `/users/addresses` endpoint returns data
- Verify authentication token is valid

### Order creation fails

- Check all required fields are sent
- Verify store ID and product IDs are valid
- Check deliveryAddressId exists

## Navigation

The checkout flow integrates with Expo Router:

- From cart: `router.push("/checkout")`
- Success redirect: `router.replace("/(tabs)")`
- Can be customized to navigate to orders page

## Security Considerations

1. **Payment Data**: Never store card details locally
2. **WebView Security**: Payment URLs should be HTTPS only
3. **Payment Verification**: Always verify payment on backend before fulfilling order
4. **User Authentication**: Ensure all API calls include valid auth tokens
5. **Reference Validation**: Validate payment reference matches the order

## Future Enhancements

Potential improvements:

- Add delivery time selection
- Order notes/special instructions
- Promo code support
- Multiple payment methods (split payment)
- Save new addresses from checkout
- Guest checkout option
- Order scheduling

## Support

For issues or questions:

1. Check console logs for errors
2. Verify all dependencies are installed
3. Ensure backend endpoints are working
4. Check payment gateway credentials
5. Review network requests in dev tools
