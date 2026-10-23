import apiClient from '../api/axios';
import { ApiResponse } from '../types/category';

export interface CategoryBudgetRecord {
  id?: string;
  category: string;
  amount: number;
  updatedAt?: string;
}

export interface BudgetRecord {
  id?: string;
  year: number;
  month: number;
  amount: number;
  category?: string;
  categoryBudgets?: CategoryBudgetRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SetCategoryBudgetPayload {
  year: number;
  month: number;
  amount?: number;
  category?: string;
  categoryBudgets?: { category: string; amount: number }[];
}

export const budgetService = {
  async getBudget(year: number, month: number, category?: string): Promise<BudgetRecord> {
    const res = await apiClient.get<ApiResponse<BudgetRecord>>('/budget', {
      params: { year, month, category },
    });
    return res.data.data;
  },

  async setBudget(year: number, month: number, amount: number, category: string = 'ALL'): Promise<BudgetRecord> {
    const res = await apiClient.post<ApiResponse<BudgetRecord>>('/budget', {
      year,
      month,
      amount,
      category,
    });
    return res.data.data;
  },

  async setCategoryBudgets(payload: SetCategoryBudgetPayload): Promise<BudgetRecord> {
    const res = await apiClient.post<ApiResponse<BudgetRecord>>('/budget', payload);
    return res.data.data;
  },
};
