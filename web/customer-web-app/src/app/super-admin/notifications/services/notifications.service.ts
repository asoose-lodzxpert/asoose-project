import { getSession } from 'next-auth/react'; // ✅ Import NextAuth
import { NotificationResponse } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const NotificationService = {

  async getAll(page: number = 1): Promise<NotificationResponse> {
    // ✅ Get NextAuth Session
    const session = await getSession();
    const token = (session as any)?.accessToken;
    
    if (!token) throw new Error('No session found');

    const res = await fetch(`${API_URL}/notifications?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markAsRead(id: string) {
    const session = await getSession();
    const token = (session as any)?.accessToken;

    if (!token) throw new Error('No session found');

    const res = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to mark as read');
    return res.json();
  },

  async markAllAsRead() {
    const session = await getSession();
    const token = (session as any)?.accessToken;

    if (!token) throw new Error('No session found');

    const res = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to mark all as read');
    return res.json();
  }
};