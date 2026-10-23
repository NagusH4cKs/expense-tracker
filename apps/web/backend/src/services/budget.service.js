import { prisma } from '../config/prisma.js';

/**
 * Get budget for a given year, month, and optional category.
 * If category is not provided, returns overall budget and all category budgets for that month.
 */
export const getBudget = async (year, month, category) => {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);

  if (category && category !== 'ALL' && category !== 'all') {
    // Specific category requested
    try {
      const budget = await prisma.budget.findUnique({
        where: {
          year_month_category: {
            year: y,
            month: m,
            category,
          },
        },
      });
      return budget || { year: y, month: m, category, amount: 0 };
    } catch (err) {
      // Fallback if schema doesn't have category compound index
      const records = await prisma.budget.findMany({
        where: { year: y, month: m },
      });
      const match = records.find((r) => r.category === category);
      return match || { year: y, month: m, category, amount: 0 };
    }
  }

  // Get all budgets for this month
  let allForMonth = [];
  try {
    allForMonth = await prisma.budget.findMany({
      where: { year: y, month: m },
    });
  } catch (err) {
    allForMonth = [];
  }

  const overall = allForMonth.find((b) => !b.category || b.category === 'ALL');
  const catBudgets = allForMonth
    .filter((b) => b.category && b.category !== 'ALL')
    .map((b) => ({
      id: b.id,
      category: b.category,
      amount: b.amount,
      updatedAt: b.updatedAt,
    }));

  const sumOfCategories = catBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalAmount = overall ? overall.amount : sumOfCategories;

  return {
    year: y,
    month: m,
    amount: totalAmount,
    category: 'ALL',
    categoryBudgets: catBudgets,
  };
};

/**
 * Set budget for a month, supports:
 * 1. Single budget: { year, month, amount, category = 'ALL' }
 * 2. Batch category budgets: { year, month, amount, categoryBudgets: [{ category, amount }] }
 */
export const setBudget = async (params) => {
  // Support both (year, month, amount, category) positional or object params
  let year, month, amount, category, categoryBudgets;
  if (typeof params === 'object') {
    ({ year, month, amount, category = 'ALL', categoryBudgets } = params);
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);

  // If batch category budgets are provided
  if (Array.isArray(categoryBudgets) && categoryBudgets.length > 0) {
    for (const item of categoryBudgets) {
      if (!item.category) continue;
      const catAmt = parseFloat(item.amount) || 0;
      await prisma.budget.upsert({
        where: {
          year_month_category: {
            year: y,
            month: m,
            category: item.category,
          },
        },
        update: {
          amount: catAmt,
        },
        create: {
          year: y,
          month: m,
          category: item.category,
          amount: catAmt,
        },
      });
    }

    // Also update overall total budget if explicitly provided or calculated
    if (amount !== undefined && !isNaN(parseFloat(amount))) {
      await prisma.budget.upsert({
        where: {
          year_month_category: {
            year: y,
            month: m,
            category: 'ALL',
          },
        },
        update: {
          amount: parseFloat(amount),
        },
        create: {
          year: y,
          month: m,
          category: 'ALL',
          amount: parseFloat(amount),
        },
      });
    }

    return getBudget(y, m);
  }

  // Single category or overall budget
  const targetCategory = category || 'ALL';
  const amt = parseFloat(amount) || 0;

  const result = await prisma.budget.upsert({
    where: {
      year_month_category: {
        year: y,
        month: m,
        category: targetCategory,
      },
    },
    update: {
      amount: amt,
    },
    create: {
      year: y,
      month: m,
      category: targetCategory,
      amount: amt,
    },
  });

  return result;
};

export const getAllBudgets = async () => {
  return prisma.budget.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
};

export const budgetService = {
  getBudget,
  setBudget,
  getAllBudgets,
};
