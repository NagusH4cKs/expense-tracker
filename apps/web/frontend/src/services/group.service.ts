import apiClient from '../api/axios';
import {
  ApiResponse,
  GroupItem,
  CreateGroupPayload,
} from '../types/category';

export const groupService = {
  // Fetch all groups (optionally filtered by category)
  async getAll(categoryId?: string): Promise<GroupItem[]> {
    const params = categoryId ? { categoryId } : {};
    const res = await apiClient.get<ApiResponse<GroupItem[]>>('/groups', { params });
    return res.data.data;
  },

  // Fetch single group by ID
  async getById(id: string): Promise<GroupItem> {
    const res = await apiClient.get<ApiResponse<GroupItem>>(`/groups/${id}`);
    return res.data.data;
  },

  // Create group
  async create(payload: CreateGroupPayload): Promise<GroupItem> {
    const res = await apiClient.post<ApiResponse<GroupItem>>('/groups', payload);
    return res.data.data;
  },

  // Update group
  async update(id: string, payload: Partial<CreateGroupPayload>): Promise<GroupItem> {
    const res = await apiClient.put<ApiResponse<GroupItem>>(`/groups/${id}`, payload);
    return res.data.data;
  },

  // Delete group
  async delete(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<{ message: string }>>(`/groups/${id}`);
  },
};
