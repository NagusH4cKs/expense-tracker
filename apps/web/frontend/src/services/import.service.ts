import apiClient from '../api/axios';
import { ApiResponse } from '../types/category';

export interface ParsedTransactionPreview {
  tempId: string;
  date: string;
  rawRemarks: string;
  description: string;
  detectedKeyword: string;
  amount: number;
  type: 'expense' | 'income';
  account: string;
  balance: number | null;
  reference: string;
  category: string;
  group: string | null;
  isNewGroup: boolean;
  confidence: string;
  isDuplicate: boolean;
  duplicateReason: string | null;
  selected: boolean;
}

export interface ImportPreviewResponse {
  accountName: string;
  totalRows: number;
  newItemsCount: number;
  duplicatesCount: number;
  detectedColumns: {
    dateIdx: number;
    remarksIdx: number;
    withdrawalIdx: number;
    depositIdx: number;
    balanceIdx: number;
    chequeIdx: number;
    sNoIdx: number;
  };
  headerRowIndex: number;
  transactions: ParsedTransactionPreview[];
}

export interface ImportConfirmResponse {
  importedCount: number;
  totalReceived: number;
  records: any[];
}

export const importService = {
  // Preview statement file (CSV or Excel) or raw CSV text
  async preview(file: File | null, csvData?: string): Promise<ImportPreviewResponse> {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<ApiResponse<ImportPreviewResponse>>('/import/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data.data;
    } else {
      const res = await apiClient.post<ApiResponse<ImportPreviewResponse>>('/import/preview', { csvData });
      return res.data.data;
    }
  },

  // Confirm import and save into database
  async confirm(transactions: ParsedTransactionPreview[], autoCreateGroups = true): Promise<ImportConfirmResponse> {
    const res = await apiClient.post<ApiResponse<ImportConfirmResponse>>('/import/confirm', {
      transactions,
      autoCreateGroups,
    });
    return res.data.data;
  },
};
