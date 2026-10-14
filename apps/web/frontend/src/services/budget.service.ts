import apiClient from '../api/axios';
import { ApiResponse } from '../types/category';

export interface BudgetRecord {
  id?: string;
  year: number;
  month: number;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}

export const budgetService = {
  async getBudget(year: number, month: number): Promise<BudgetRecord> {
    const res = await apiClient.get<ApiResponse<BudgetRecord>>('/budget', {
      params: { year, month },
    });
    return res.data.data;
  },

  async setBudget(year: number, month: number, amount: number): Promise<BudgetRecord> {
    const res = await apiClient.post<ApiResponse<BudgetRecord>>('/budget', {
      year,
      month,
      amount,
    });
    return res.data.data;
  },
};
