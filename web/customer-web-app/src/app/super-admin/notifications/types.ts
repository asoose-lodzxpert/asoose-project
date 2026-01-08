export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'ORDER' | 'ALERT' | 'INFO' | 'SUCCESS' | 'RIDE' | 'PAYMENT';
  isRead: boolean;
  createdAt: string; 
  metadata?: Record<string, any>;
}

export interface NotificationResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    pages: number;
  };
}