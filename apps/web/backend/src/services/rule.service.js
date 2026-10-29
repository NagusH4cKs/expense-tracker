import { prisma } from '../config/prisma.js';

/**
 * Normalize text for matching without mutating original remarks
 */
export const normalizeText = (text) => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[^\w\s\/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Match a text against a pattern based on matchType
 */
export const testPattern = (targetText, pattern, matchType = 'contains') => {
  if (!targetText || !pattern) return false;
  const normalizedTarget = normalizeText(targetText);
  const normalizedPattern = normalizeText(pattern);

  switch (matchType) {
    case 'exact':
      return normalizedTarget === normalizedPattern;

    case 'prefix':
      // Check if target starts with pattern token
      return normalizedTarget.startsWith(normalizedPattern) ||
        targetText.toLowerCase().trim().startsWith(pattern.toLowerCase().trim());

    case 'regex':
      try {
        const re = new RegExp(pattern, 'i');
        return re.test(targetText);
      } catch {
        return false;
      }

    case 'contains':
    default: {
      // Split pattern by comma or semicolon to allow multi-keyword patterns
      const tokens = pattern
        .split(/[,;]/)
        .map((t) => normalizeText(t))
        .filter(Boolean);

      if (tokens.length === 0) return false;
      return tokens.some((token) => {
        // Use word boundary or direct inclusion
        return normalizedTarget.includes(token);
      });
    }
  }
};

/**
 * Match a transaction description & remarks against active rules
 */
export const matchTransactionWithRules = (transaction, rules = [], dbCategories = []) => {
  const { rawRemarks = '', description = '', account = '' } = transaction;
  const remarksNorm = normalizeText(rawRemarks);
  const descNorm = normalizeText(description);
  const combined = `${remarksNorm} ${descNorm}`.trim();

  // Sort rules: Bank-specific first (if matches account), then by priority descending
  const sortedRules = [...rules]
    .filter((r) => r.isActive)
    .sort((a, b) => {
      const aBankMatch = a.bank && a.bank !== 'ALL' && a.bank.toLowerCase() === account.toLowerCase() ? 1 : 0;
      const bBankMatch = b.bank && b.bank !== 'ALL' && b.bank.toLowerCase() === account.toLowerCase() ? 1 : 0;
      if (aBankMatch !== bBankMatch) return bBankMatch - aBankMatch;
      return (b.priority || 0) - (a.priority || 0);
    });

  for (const rule of sortedRules) {
    let matched = false;

    // Check rawRemarks and combined description
    if (rule.matchType === 'prefix') {
      matched = testPattern(rawRemarks, rule.pattern, 'prefix') || testPattern(remarksNorm, rule.pattern, 'prefix');
    } else {
      matched = testPattern(combined, rule.pattern, rule.matchType) ||
                testPattern(rawRemarks, rule.pattern, rule.matchType);
    }

    if (matched) {
      // Find matching category to verify existence
      const targetCat = dbCategories.find(
        (c) => c.name.toLowerCase() === rule.category.toLowerCase()
      );
      const categoryName = targetCat ? targetCat.name : rule.category;
      const isTransfer = categoryName.toLowerCase() === 'transfer';

      return {
        category: categoryName,
        group: rule.group || null,
        confidence: 'high',
        matchedRuleId: rule.id,
        needsReview: false,
        isTransfer,
      };
    }
  }

  // No reliable rule matched -> Flag ambiguous / unmatched transaction for review
  return {
    category: 'Needs review',
    group: null,
    confidence: 'low',
    matchedRuleId: null,
    needsReview: true,
    isTransfer: false,
  };
};

export const ruleService = {
  async getAll(filters = {}) {
    const where = {};
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }
    if (filters.bank && filters.bank !== 'ALL') {
      where.OR = [{ bank: filters.bank }, { bank: 'ALL' }, { bank: null }];
    }

    return prisma.categorizationRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async getById(id) {
    return prisma.categorizationRule.findUnique({ where: { id } });
  },

  async create(data) {
    const { pattern, matchType = 'contains', category, group, priority = 50, bank = 'ALL', isUserCreated = false } = data;
    if (!pattern || !pattern.trim()) throw new Error('Pattern is required');
    if (!category || !category.trim()) throw new Error('Category is required');

    return prisma.categorizationRule.create({
      data: {
        pattern: pattern.trim(),
        matchType,
        category: category.trim(),
        group: group && group.trim() ? group.trim() : null,
        priority: Number(priority) || 50,
        bank: bank ? bank.trim() : 'ALL',
        isActive: true,
        isUserCreated: Boolean(isUserCreated),
      },
    });
  },

  async update(id, data) {
    const existing = await prisma.categorizationRule.findUnique({ where: { id } });
    if (!existing) throw new Error('Rule not found');

    const updateData = {};
    if (data.pattern !== undefined) updateData.pattern = data.pattern.trim();
    if (data.matchType !== undefined) updateData.matchType = data.matchType;
    if (data.category !== undefined) updateData.category = data.category.trim();
    if (data.group !== undefined) updateData.group = data.group && data.group.trim() ? data.group.trim() : null;
    if (data.priority !== undefined) updateData.priority = Number(data.priority);
    if (data.bank !== undefined) updateData.bank = data.bank ? data.bank.trim() : 'ALL';
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    return prisma.categorizationRule.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id) {
    return prisma.categorizationRule.delete({ where: { id } });
  },

  matchTransactionWithRules,
};
