import React from "react";
import Link from "next/link";
import { Package, ExternalLink, AlertTriangle } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { TransactionDetail } from "../types";
import { Currency } from "@/app/main/components/Currency";
import { validateOrderFinancialBreakdown } from "@/utils/financial"; // ✅ Added validation

interface OrderDetailsProps {
  details: NonNullable<TransactionDetail["orderDetails"]>;
  financialBreakdown?: TransactionDetail["financialBreakdown"];
}

export const OrderDetailsCard = ({
  details,
  financialBreakdown,
}: OrderDetailsProps) => {
  // ✅ FIXED: Validate financial breakdown
  let validationError: string | null = null;
  if (
    financialBreakdown &&
    (details.type === "SINGLE_ORDER" || !details.type)
  ) {
    const validation = validateOrderFinancialBreakdown({
      subtotal: details.subtotal,
      commissionRate: details.commissionRate || 0,
      commissionAmount: financialBreakdown.platformCommission,
      vendorReceives: financialBreakdown.vendorReceives,
    });
    if (!validation.valid) {
      validationError = validation.errors.join("; ");
      console.error("💰 Financial Breakdown Validation Error:", validationError);
    }
  }

  // Since details.orderId might be undefined for group orders, use 'details.orderId || #'
  const action =
    details.type === "GROUP_ORDER" ? null : (
      <Link
        href={`/super-admin/orders/${details.orderId}`}
        className="text-yellow-500 hover:text-yellow-400 text-sm font-medium flex items-center gap-2"
      >
        View Order <ExternalLink className="w-3 h-3" />
      </Link>
    );

  return (
    <SectionCard
      title="Order Details"
      icon={Package}
      iconColorClass="bg-blue-500/20 text-blue-500"
      action={action}
    >
      <div className="space-y-6">
        {/* Header Stats */}
        {details.type === "SINGLE_ORDER" || !details.type ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-gray-400 text-xs">Order ID</p>
              <p className="text-white font-mono text-sm">{details.orderId}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400 text-xs">Vendor</p>
              <p className="text-white font-medium">{details.vendor}</p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400 text-xs">Commission Rate</p>
              <p className="text-orange-500 font-medium">
                {details.commissionRate}%
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-gray-400 text-xs">Group ID</p>
              <p className="text-white font-mono text-sm text-truncate">
                {details.groupId}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400 text-xs">Type</p>
              <p className="text-white font-medium">Multi-Vendor Order</p>
            </div>
          </div>
        )}

        {/* Sub-Orders for Group Orders */}
        {details.type === "GROUP_ORDER" && details.subOrders && (
          <div className="border-t border-gray-700 pt-6">
            <h4 className="text-white font-medium mb-4">Sub-Orders</h4>
            <div className="space-y-2">
              {details.subOrders.map((subOrder, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-[#0F172A] rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium text-sm">
                      {subOrder.store}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Commission: {subOrder.commissionRate}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">
                      <Currency amount={subOrder.total} />
                    </p>
                    {(subOrder.deliveryFee ?? 0) > 0 && (
                      <p className="text-blue-400 text-xs">
                        Delivery: <Currency amount={subOrder.deliveryFee} />
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="border-t border-gray-700 pt-6">
          <h4 className="text-white font-medium mb-4">Items Ordered</h4>
          <div className="space-y-3">
            {details.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <p className="text-white font-medium">{item.name}</p>
                    {/* ✅ Fixed: Formatted item price */}
                    <p className="text-gray-400 text-sm">
                      Qty: {item.qty} × <Currency amount={item.price} />
                    </p>
                  </div>
                </div>
                {/* ✅ Fixed: Formatted item total */}
                <span className="text-white font-bold">
                  <Currency amount={item.total} />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Breakdown */}
        {financialBreakdown && (
          <div className="border-t border-gray-700 pt-6">
            <h4 className="text-white font-medium mb-4">Financial Breakdown</h4>
            
            {/* ✅ FIXED: Show validation error if present */}
            {validationError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-500 text-xs font-medium">Calculation Error Detected</p>
                  <p className="text-red-400 text-xs mt-1">{validationError}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              {(details.type === "SINGLE_ORDER" || !details.type) && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal</span>
                    {/* ✅ Fixed: Formatted subtotal */}
                    <span className="text-white">
                      <Currency amount={details.subtotal} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">
                      Platform Commission ({details.commissionRate}%)
                    </span>
                    {/* ✅ Fixed: Formatted commission */}
                    <span className="text-orange-500">
                      -<Currency amount={financialBreakdown.platformCommission} />
                    </span>
                  </div>
                </>
              )}

              {/* Delivery Fee */}
              {financialBreakdown.deliveryFee !== undefined &&
                financialBreakdown.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Delivery Fee</span>
                    <span className="text-blue-400">
                      <Currency amount={financialBreakdown.deliveryFee} />
                    </span>
                  </div>
                )}

              {/* Vendor Receives (Single Order) */}
              {(details.type === "SINGLE_ORDER" || !details.type) && (
                <div className="flex justify-between pt-3 border-t border-gray-700">
                  <span className="text-gray-300 font-medium">
                    Vendor Receives
                  </span>
                  <span className="text-green-500 font-bold text-lg">
                    {/* ✅ Fixed: Formatted vendor amount */}
                    <Currency amount={financialBreakdown.vendorReceives} />
                  </span>
                </div>
              )}

              {/* Customer Paid (Group Order) */}
              {details.type === "GROUP_ORDER" && (
                <div className="flex justify-between pt-3 border-t border-gray-700">
                  <span className="text-gray-300 font-medium">
                    Total Customer Paid
                  </span>
                  <span className="text-green-500 font-bold text-lg">
                    <Currency amount={financialBreakdown.customerPaid} />
                  </span>
                </div>
              )}

              {/* Note for Group Orders */}
              {financialBreakdown.note && (
                <p className="text-gray-400 text-xs pt-3 border-t border-gray-700 italic">
                  {financialBreakdown.note}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
};
