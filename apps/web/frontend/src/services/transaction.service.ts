import apiClient from '../api/axios';
import { ApiResponse } from '../types/category';

export interface TransactionItem {
  id: string;
  date: string;
  description: string;
  category: string;
  group?: string | null;
  amount: number;
  type: 'expense' | 'income';
  account: string;
  reference?: string | null;
  remarks?: string | null;
  balance?: number | null;
  needsReview?: boolean;
  confidence?: string | null;
  isTransfer?: boolean;
  transferLinkedId?: string | null;
  transferStatus?: string | null;
  excludeFromReport?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  type?: 'expense' | 'income';
  account?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  year?: string;
  month?: string;
  date?: string;
  needsReview?: string | boolean;
  isTransfer?: string | boolean;
  excludeFromReport?: string | boolean;
}

export interface CategoryBreakdownItem {
  name: string;
  value: number;
  percentage: number;
  count: number;
}

export interface TimeSeriesItem {
  label: string;
  date?: string;
  month?: string;
  income: number;
  expense: number;
}

export interface BudgetInfo {
  category: string;
  budgetAmount: number;
  actualAmount: number;
  incomeAmount: number;
  expenseAmount: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
  transactionCount: number;
  remainingBudget: number;
  overBudget: number;
  percentageSpent: number;
  totalCategoryBudget?: number;
  monthlyAllBudget?: number;
  isTalliedFromCategories?: boolean;
}

export interface CategoryFinancialItem {
  categoryId: string;
  category: string;
  type: 'expense' | 'income' | 'transfer';
  budgetAmount: number;
  incomeAmount: number;
  expenseAmount: number;
  remainingBudget: number;
  overBudget: number;
  percentageSpent: number;
  transactionCount: number;
}

export interface AnalyticsData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    count: number;
  };
  budget: BudgetInfo;
  categoryFinancials?: CategoryFinancialItem[];
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
  budgetCategory?: string;
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
  needsReview?: boolean;
  isTransfer?: boolean;
  excludeFromReport?: boolean;
  saveAsRule?: boolean;
  rulePattern?: string;
  ruleMatchType?: 'contains' | 'exact' | 'prefix' | 'regex';
  rulePriority?: number;
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

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/transactions/${id}`);
  },

  async getAnalytics(params?: GetAnalyticsQuery): Promise<AnalyticsData> {
    const res = await apiClient.get<ApiResponse<AnalyticsData>>('/transactions/analytics', { params });
    return res.data.data;
  },
};
