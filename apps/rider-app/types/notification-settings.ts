export interface NotificationSettings {
  id: string;
  riderId: string;
  masterEnabled: boolean;

  // Delivery notifications
  newOrders: boolean;
  orderUpdates: boolean;
  vibration: boolean;

  // Earnings notifications
  paymentUpdates: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;

  // Account & Safety
  securityAlerts: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateNotificationSettingsDto {
  masterEnabled?: boolean;
  newOrders?: boolean;
  orderUpdates?: boolean;
  vibration?: boolean;
  paymentUpdates?: boolean;
  dailySummary?: boolean;
  weeklySummary?: boolean;
  securityAlerts?: boolean;
}

export interface NotificationSettingsResponse {
  settings: NotificationSettings;
}
