import apiClient from '../api/axios';

export interface DebtRepayment { id: string; amount: number; date: string; note?: string | null }
export interface DebtItem {
  id: string; person: string; description?: string | null; amount: number; lentDate: string;
  repaidAmount: number; outstandingAmount: number; isPaid: boolean; repayments: DebtRepayment[];
}
export const debtService = {
  async list(): Promise<DebtItem[]> { return (await apiClient.get('/debts')).data.data; },
  async create(data: { person: string; description?: string; amount: number; lentDate: string }): Promise<DebtItem> {
    return (await apiClient.post('/debts', data)).data.data;
  },
  async repay(id: string, data: { amount: number; date: string; note?: string }): Promise<DebtItem> {
    return (await apiClient.post(`/debts/${id}/repayments`, data)).data.data;
  },
};
