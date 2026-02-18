/**
 * Default notification settings for customers.
 * These correspond to notification preference keys.
 */
export const DEFAULT_NOTIFICATION_SETTINGS: Record<string, boolean> = {
  orderUpdates: true,
  rideUpdates: true,
  deliveryUpdates: true,
  promotions: false,
  newsletter: false,
  specialOffers: false,
};
