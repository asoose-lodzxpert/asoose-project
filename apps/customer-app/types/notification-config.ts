export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category?: string;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}
export type NotificationConfig = {
  push: boolean;
  sms: boolean;
  email: boolean;
  emergencyAlerts: boolean;
  tripUpdates: boolean;
};
