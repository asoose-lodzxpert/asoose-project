import { createClient } from '../../../../../utils/supabase/client';
import { NotificationResponse } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const NotificationService = {
  async getAll(page: number = 1): Promise<NotificationResponse> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) throw new Error('No session found');

    const res = await fetch(`${API_URL}/notifications?page=${page}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markAsRead(id: string) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });

    if (!res.ok) throw new Error('Failed to mark as read');
    return res.json();
  },

  async markAllAsRead() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });

    if (!res.ok) throw new Error('Failed to mark all as read');
    return res.json();
  }
};