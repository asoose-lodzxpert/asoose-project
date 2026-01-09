import { fetchWithAuth } from './auth-fetch';

const API = process.env.EXPO_PUBLIC_API_URL;

export async function getNotificationPreferences() {
  const res = await fetchWithAuth(`${API}/auth/vendor/notifications-preferences`);
  return res;
}

export async function updateNotificationPreferences(preferences: any) {
  const res = await fetchWithAuth(`${API}/auth/vendor/notifications-preferences`, {
    method: 'PUT',
    body: JSON.stringify(preferences),
    headers: { 'Content-Type': 'application/json' },
  });
  return res;
}
