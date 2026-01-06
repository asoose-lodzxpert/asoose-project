export interface SettingsData {
  platformName: string;
  supportEmail: string;
  rideCommission: number;
  foodCommission: number;
  taxRate: number;
  autoAssignRiders: boolean;
  maintenanceMode: boolean;
}

export const DEFAULT_SETTINGS: SettingsData = {
  platformName: 'Asoosee SuperApp',
  supportEmail: 'support@asoosee.com',
  rideCommission: 15,
  foodCommission: 10,
  taxRate: 5,
  autoAssignRiders: true,
  maintenanceMode: false,
};