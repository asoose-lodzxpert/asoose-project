export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category?: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UnreadCountResponse {
  count: number;
}
