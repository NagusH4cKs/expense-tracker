export interface CategorizationRule {
  id: string;
  pattern: string;
  matchType: 'contains' | 'exact' | 'prefix' | 'regex';
  category: string;
  group?: string | null;
  priority: number;
  bank?: string | null;
  isActive: boolean;
  isUserCreated: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRulePayload {
  pattern: string;
  matchType?: 'contains' | 'exact' | 'prefix' | 'regex';
  category: string;
  group?: string;
  priority?: number;
  bank?: string;
  isUserCreated?: boolean;
}

export interface UpdateRulePayload {
  pattern?: string;
  matchType?: 'contains' | 'exact' | 'prefix' | 'regex';
  category?: string;
  group?: string | null;
  priority?: number;
  bank?: string | null;
  isActive?: boolean;
}
