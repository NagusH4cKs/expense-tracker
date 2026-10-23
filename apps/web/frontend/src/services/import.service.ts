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

export interface ImportProgress {
  completed: number;
  total: number;
  imported: number;
  batch: number;
  batchCount: number;
}

export const IMPORT_BATCH_SIZE = 50;
export const importTimeout = (rowCount: number) => Math.max(60000, Math.min(180000, 30000 + rowCount * 1000));

export const importService = {
  // Preview statement file (CSV or Excel) or raw CSV text
  async preview(file: File | null, csvData?: string): Promise<ImportPreviewResponse> {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<ApiResponse<ImportPreviewResponse>>('/import/preview', formData, {
        timeout: Math.max(60000, Math.min(180000, 60000 + Math.ceil(file.size / 1024) * 200)),
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data.data;
    } else {
      const res = await apiClient.post<ApiResponse<ImportPreviewResponse>>('/import/preview', { csvData }, {
        timeout: Math.max(60000, Math.min(180000, 60000 + Math.ceil((csvData?.length ?? 0) / 1024) * 200)),
      });
      return res.data.data;
    }
  },

  // Confirm import and save into database
  async confirm(
    transactions: ParsedTransactionPreview[],
    autoCreateGroups = true,
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<ImportConfirmResponse> {
    const selected = transactions.filter((item) => item.selected && !item.isDuplicate);
    const batchCount = Math.ceil(selected.length / IMPORT_BATCH_SIZE);
    let importedCount = 0;
    let completed = 0;

    for (let index = 0; index < batchCount; index++) {
      const batch = selected.slice(index * IMPORT_BATCH_SIZE, (index + 1) * IMPORT_BATCH_SIZE);
      try {
        const res = await apiClient.post<ApiResponse<ImportConfirmResponse>>('/import/confirm', {
          transactions: batch,
          autoCreateGroups,
        }, { timeout: importTimeout(batch.length) });
        importedCount += res.data.data.importedCount;
        completed += batch.length;
        onProgress?.({ completed, total: selected.length, imported: importedCount, batch: Math.min(index + 2, batchCount), batchCount });
      } catch (error: any) {
        error.importProgress = { completed, total: selected.length, imported: importedCount, batch: index + 1, batchCount };
        throw error;
      }
    }

    return { importedCount, totalReceived: selected.length, records: [] };
  },
};
