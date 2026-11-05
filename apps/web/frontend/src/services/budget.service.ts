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

export interface MonthBudgetsResponse {
  year: number;
  month: number;
  allBudget: number;
  totalCategoryBudget: number;
  effectiveBudget: number;
  records: BudgetRecord[];
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

  async setBatchBudgets(year: number, month: number, budgets: Array<{ category: string; amount: number }>): Promise<BudgetRecord[]> {
    const res = await apiClient.post<ApiResponse<BudgetRecord[]>>('/budget/batch', {
      year,
      month,
      budgets,
    });
    return res.data.data;
  },

  async getBudgetsForMonth(year: number, month: number): Promise<MonthBudgetsResponse> {
    const res = await apiClient.get<ApiResponse<MonthBudgetsResponse>>('/budget', {
      params: { year, month },
    });
    return res.data.data;
  },
};
