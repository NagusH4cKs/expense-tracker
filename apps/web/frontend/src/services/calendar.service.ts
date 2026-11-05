import apiClient from '../api/axios';
import { ApiResponse } from '../types/category';

export interface CalendarEventItem {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  dueTime?: string | null;
  amount?: number | null;
  category?: string | null;
  isCompleted: boolean;
}

export interface CalendarEventPayload {
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  amount?: number | null;
  category?: string;
  isCompleted?: boolean;
}

export const calendarService = {
  async list(): Promise<CalendarEventItem[]> {
    return (await apiClient.get<ApiResponse<CalendarEventItem[]>>('/calendar-events')).data.data;
  },
  async create(payload: CalendarEventPayload): Promise<CalendarEventItem> {
    return (await apiClient.post<ApiResponse<CalendarEventItem>>('/calendar-events', payload)).data.data;
  },
  async update(id: string, payload: Partial<CalendarEventPayload>): Promise<CalendarEventItem> {
    return (await apiClient.patch<ApiResponse<CalendarEventItem>>(`/calendar-events/${id}`, payload)).data.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/calendar-events/${id}`);
  },
};
