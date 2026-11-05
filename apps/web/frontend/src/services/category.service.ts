import apiClient from '../api/axios';
import {
  ApiResponse,
  CategoryItem,
  CreateCategoryPayload,
} from '../types/category';

export const categoryService = {
  // Fetch all categories with their associated groups
  async getAll(type?: 'expense' | 'income'): Promise<CategoryItem[]> {
    const params = type ? { type } : {};
    const res = await apiClient.get<ApiResponse<CategoryItem[]>>('/categories', { params });
    return res.data.data;
  },

  // Fetch single category by ID with its groups
  async getById(id: string): Promise<CategoryItem> {
    const res = await apiClient.get<ApiResponse<CategoryItem>>(`/categories/${id}`);
    return res.data.data;
  },

  // Create a new category with optional groups
  async create(payload: CreateCategoryPayload): Promise<CategoryItem> {
    const res = await apiClient.post<ApiResponse<CategoryItem>>('/categories', payload);
    return res.data.data;
  },

  // Update category
  async update(id: string, payload: Partial<CreateCategoryPayload>): Promise<CategoryItem> {
    const res = await apiClient.put<ApiResponse<CategoryItem>>(`/categories/${id}`, payload);
    return res.data.data;
  },

  // Delete category
  async delete(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<{ message: string }>>(`/categories/${id}`);
  },
};
