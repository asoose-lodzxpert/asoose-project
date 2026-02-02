/**
 * Type representing possible notification setting keys.
 * - "newOrders"
 * - "orderUpdates"
 * - "orderReminders"
 * - "paymentReceived"
 * - "dailySummary"
 * - "weeklyReports"
 * - "promotions"
 */
export const DEFAULT_NOTIFICATION_SETTINGS: Record<string, boolean> = {
  newOrders: true,
  orderUpdates: true,
  orderReminders: false,
  paymentReceived: true,
  dailySummary: false,
  weeklyReports: true,
  promotions: false,
};
