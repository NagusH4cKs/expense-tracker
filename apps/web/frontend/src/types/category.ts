export interface GroupItem {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  type: 'expense' | 'income' | 'transfer';
  description?: string | null;
  groups: GroupItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryPayload {
  name: string;
  type?: 'expense' | 'income' | 'transfer';
  description?: string;
  groupNames?: string[];
  groupIds?: string[];
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  categoryId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
