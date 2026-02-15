/**
 * Default notification settings for riders.
 * These correspond to notification preference keys.
 */
export const DEFAULT_NOTIFICATION_SETTINGS: Record<string, boolean> = {
  newJobs: true,
  jobUpdates: true,
  jobReminders: false,
  earningsReceived: true,
  dailySummary: false,
  weeklyReports: true,
  promotions: false,
};
