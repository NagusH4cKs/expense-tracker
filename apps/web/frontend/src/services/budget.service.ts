import apiClient from '../api/axios';
import { ApiResponse } from '../types/category';

export interface BudgetRecord {
  id?: string;
  year: number;
  month: number;
  amount: number;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const budgetService = {
  async setBudget(year: number, month: number, amount: number, category: string = 'ALL'): Promise<BudgetRecord> {
    const res = await apiClient.post<ApiResponse<BudgetRecord>>('/budget', {
      year,
      month,
      amount,
      category,
    });
    return res.data.data;
  },

};
