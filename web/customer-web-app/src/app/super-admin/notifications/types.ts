export type NotificationType =
  | 'ORDER'
  | 'RIDE'
  | 'DELIVERY'
  | 'ALERT'
  | 'INFO'
  | 'SUCCESS'
  | 'PAYMENT';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  /** Fine-grained category: ORDER_CREATED, RIDE_REQUESTED, DELIVERY_UPDATE, etc. */
  category?: string;
  isRead: boolean;
  createdAt: string;
  /** Carries orderId | rideId | deliveryId so the card can link to the detail page */
  metadata?: Record<string, any>;
  /** Resolved from user | vendor | rider relation */
  recipientName?: string;
  recipientEmail?: string | null;
}

export interface NotificationResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    pages: number;
  };
}
