export type NotificationTab = "orders" | "payouts" | "system";

export interface Notification {
  id: string;
  type: NotificationTab;
  title: string;
  timestamp: string;
  summary: string;
  actionLabel?: string;
  actionCallback?: () => void;
}
