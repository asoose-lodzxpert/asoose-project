📑 Documentation: Refund Integration Specification
Target Audience: Finance/Ledger Developer Context: When a Vendor Declines a prepaid order, the system automatically triggers a refund state.

1. The Trigger
The trigger occurs in VendorOrdersService.declineOrder(). When an order is declined, the Order module performs an atomic transaction that:

Updates Order.status to REJECTED.

Updates Payment.status to REFUNDED.

Creates a Ledger Entry in the Transaction table.

2. The Data Artifact
Your system (Finance Module) needs to monitor the Transaction table. You will see a new record created with the following signature:

JSON

{
  "type": "REFUND_ISSUED",
  "status": "COMPLETED", // Internal ledger status
  "entityType": "PLATFORM",
  "amount": 5000.00,
  "paymentId": "pay_12345...",
  "orderId": "ord_98765...",
  "metadata": {
    "reason": "Vendor busy",
    "automatic": true
  }
}
3. Responsibilities (Finance Team)
You do not need to update the Order status (it is already handled). Your responsibilities are:

External Gateway Refund:

If Payment.method was CARD, you must listen for this REFUND_ISSUED event and trigger the Stripe/Paystack refund API.

If that API call fails, you must update the Transaction.status to FAILED and alert Support.

Wallet Reversals:

If Payment.method was WALLET, ensure the user's wallet balance is incremented (if not already handled by a database trigger).

Reconciliation:

Ensure the PLATFORM wallet balance accurately reflects this money moving out.