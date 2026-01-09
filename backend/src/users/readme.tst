1. Architecture Overview
Currently, the system creates an order with the status PENDING. Your responsibility is to intercept this flow, initialize a payment (e.g., Paystack, Flutterwave, Stripe), and handle the asynchronous confirmation via Webhooks.

The Target Flow
Frontend: User clicks "Place Order" -> calls POST /users/orders.

Backend: Creates Order (PENDING) -> Initializes Payment -> Returns paymentUrl or access_code.

Frontend: Redirects user to Payment Gateway or opens modal.

Gateway: User pays -> Gateway calls Backend Webhook.

Backend Webhook: Verifies signature -> Updates Order (CONFIRMED) -> Updates Ledger.

2. Backend Implementation (/backend)
A. Update OrdersService (Return Payment Data)
In src/users/orders.service.ts, the createOrder method currently returns the raw order object. You must modify this to:

Interact with your Payment Provider's API to initialize the transaction.

Create a Payment record in the database with status PENDING.

Return the payment authorization URL to the frontend.

Key Database Models to Use:

Payment: Linked to Order via orderId.

User: You have the user's email and id for the payment payload.

B. Create Webhook Endpoint (Critical)
You need to create a new controller (e.g., src/payments/payments.controller.ts) to handle the callback.

Requirements:

Verify Signature: Ensure the request comes from the Payment Provider (check headers).

Idempotency: The gateway might send the same webhook twice. Check if Payment.status is already COMPLETED.

Atomic Updates: Use prisma.$transaction to perform the following updates simultaneously:

TypeScript

// Pseudo-code for Webhook Transaction
await prisma.$transaction(async (tx) => {
  // 1. Update Payment Status
  const payment = await tx.payment.update({
    where: { reference: gatewayReference },
    data: { status: 'COMPLETED', method: 'CARD' }
  });

  // 2. Update Order Status
  await tx.order.update({
    where: { id: payment.orderId },
    data: { status: 'CONFIRMED' } // or 'PREPARING'
  });

  // 3. Create Ledger Entry (CRITICAL for accounting)
  // Refer to schema.prisma "Transaction" model
  await tx.transaction.create({
    data: {
      type: 'PAYMENT_RECEIVED',
      amount: payment.amount,
      balanceBefore: 0, // Fetch actual wallet logic if needed
      balanceAfter: payment.amount, 
      description: `Order payment for #${payment.orderId}`,
      entityType: 'PLATFORM', // Money hits platform first
      paymentId: payment.id,
      orderId: payment.orderId,
      status: 'COMPLETED'
    }
  });
});
3. Frontend Implementation (/customer-web-app)
File: src/app/checkout/page.tsx

Currently, handlePlaceOrder expects the order to be done immediately. You need to update the success block:

TypeScript

// src/app/checkout/page.tsx

const handlePlaceOrder = async () => {
    // ... validation ...
    
    try {
        const res = await fetch(`${API_URL}/users/orders`, { ... });
        const data = await res.json(); // "data" will now contain paymentUrl

        // NEW: Check for Payment URL
        if (data.paymentUrl) {
            // Redirect to Gateway
            window.location.href = data.paymentUrl; 
            return;
        }

        // Fallback for Cash/Wallet (if implemented later)
        // ... existing success Swal logic ...
    } catch (error) {
        // ...
    }
};
4. Database Schema Reference
You will primarily work with these schemas defined in prisma/schema.prisma:

Order:

status: Transitions from PENDING -> CONFIRMED.

total: The expected amount to be paid.

Payment:

This is distinct from the Order. One Order could theoretically have multiple payment attempts (failed/retried).

Fields: transactionId (Provider Ref), amount, status.

Transaction:

Strict Rule: Every successful payment must generate a Transaction record.

This is used by the Admin Finance Dashboard to calculate revenue.

5. Security Checklist
[ ] Secret Management: Store Payment Gateway Secret Keys in .env. Never hardcode them.

[ ] Signature Verification: Replicate the provider's signature logic strictly. Reject any webhook without a valid signature.

[ ] Amount Validation: In the webhook, verify that paid_amount >= order.total. Users can sometimes manipulate client-side scripts to pay 1.00 instead of 1000.00.

Next Steps:

Configure .env with Gateway keys.

Scaffold PaymentsModule in NestJS.

Implement the initializePayment logic in OrdersService.