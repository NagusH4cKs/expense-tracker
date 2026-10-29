import apiClient from '../api/axios';
import { CategorizationRule, CreateRulePayload, UpdateRulePayload } from '../types/rule';
import { ApiResponse } from '../types/category';

export const ruleService = {
  async getAll(params?: { bank?: string; isActive?: boolean }): Promise<CategorizationRule[]> {
    const res = await apiClient.get<ApiResponse<CategorizationRule[]>>('/rules', { params });
    return res.data.data;
  },

  async create(payload: CreateRulePayload): Promise<CategorizationRule> {
    const res = await apiClient.post<ApiResponse<CategorizationRule>>('/rules', payload);
    return res.data.data;
  },

  async update(id: string, payload: UpdateRulePayload): Promise<CategorizationRule> {
    const res = await apiClient.put<ApiResponse<CategorizationRule>>(`/rules/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/rules/${id}`);
  },
};
