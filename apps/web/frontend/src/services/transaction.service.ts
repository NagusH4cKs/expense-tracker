import apiClient from '../api/axios';
import { ApiResponse } from '../types/category';

export interface TransactionItem {
  id: string;
  date: string;
  description: string;
  remarks?: string | null;
  category: string;
  group?: string | null;
  amount: number;
  type: 'expense' | 'income';
  account: string;
  reference?: string | null;
  balance?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  count: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedTransactionsResponse {
  items: TransactionItem[];
  pagination: PaginationMeta;
}

export interface GetTransactionsQuery {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  type?: string;
  account?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  month?: string;
  year?: string;
}

export interface CategoryBreakdownItem {
  name: string;
  value: number;
  count: number;
  percentage: number;
}

export interface TimeSeriesItem {
  label: string;
  date?: string;
  month?: string;
  income: number;
  expense: number;
}

export interface CategoryBudgetDetail {
  category: string;
  budgetAmount: number;
  spentAmount: number;
  remainingBudget: number;
  overBudget: number;
  percentageSpent: number;
  transactionCount?: number;
}

export interface BudgetInfo {
  budgetAmount: number;
  remainingBudget: number;
  overBudget: number;
  percentageSpent: number;
  categories?: CategoryBudgetDetail[];
}

export interface AnalyticsData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    count: number;
  };
  budget: BudgetInfo;
  categoryBreakdown: CategoryBreakdownItem[];
  timeSeries: TimeSeriesItem[];
  filters: {
    availableYears: string[];
    availableMonths: string[];
    availableDates: string[];
  };
}

export interface GetAnalyticsQuery {
  year?: string;
  month?: string;
  date?: string;
}

export interface CreateTransactionDto {
  date: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  group?: string | null;
  account: string;
  remarks?: string | null;
  reference?: string | null;
}

export const transactionService = {
  async create(data: CreateTransactionDto): Promise<TransactionItem> {
    const res = await apiClient.post<ApiResponse<TransactionItem>>('/transactions', data);
    return res.data.data;
  },

  async update(id: string, data: Partial<CreateTransactionDto>): Promise<TransactionItem> {
    const res = await apiClient.patch<ApiResponse<TransactionItem>>(`/transactions/${id}`, data);
    return res.data.data;
  },

  async getAll(params?: GetTransactionsQuery): Promise<PaginatedTransactionsResponse> {
    const res = await apiClient.get<{ success: boolean; data: TransactionItem[]; pagination: PaginationMeta }>('/transactions', { params });
    return {
      items: res.data.data,
      pagination: res.data.pagination || {
        total: res.data.data.length,
        page: params?.page || 1,
        limit: params?.limit || 10,
        totalPages: Math.ceil(res.data.data.length / (params?.limit || 10)) || 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  async getSummary(): Promise<TransactionSummary> {
    const res = await apiClient.get<ApiResponse<TransactionSummary>>('/transactions/summary');
    return res.data.data;
  },

  async getAnalytics(params?: GetAnalyticsQuery): Promise<AnalyticsData> {
    const res = await apiClient.get<ApiResponse<AnalyticsData>>('/transactions/analytics', { params });
    return res.data.data;
  },

  async filter(params?: GetTransactionsQuery): Promise<PaginatedTransactionsResponse> {
    const res = await apiClient.post<{ success: boolean; data: TransactionItem[]; pagination: PaginationMeta }>('/transactions/filter', params);
    return {
      items: res.data.data,
      pagination: res.data.pagination,
    };
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<{ message: string }>>(`/transactions/${id}`);
  },
};
