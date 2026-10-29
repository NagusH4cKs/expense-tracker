import { prisma } from '../config/prisma.js';

const budgetKey = (year, month, category) => ({
  year: Number(year),
  month: Number(month),
  category: category || 'ALL',
});

export const setBudget = async ({ year, month, category = 'ALL', amount }) => {
  const key = budgetKey(year, month, category);
  const parsedAmount = Number(amount);

  if (!Number.isInteger(key.year) || !Number.isInteger(key.month) || key.month < 1 || key.month > 12) {
    throw new Error('A valid year and month are required');
  }
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    throw new Error('Budget amount must be a non-negative number');
  }
  if (key.category !== 'ALL') {
    const masterCategory = await prisma.category.findUnique({ where: { name: key.category } });
    if (!masterCategory) {
      throw new Error(`Select a valid category from category master. "${key.category}" not found.`);
    }
  }

  return prisma.budget.upsert({
    where: { year_month_category: key },
    update: { amount: parsedAmount },
    create: { ...key, amount: parsedAmount },
  });
};

export const setBatchBudgets = async ({ year, month, budgets = [] }) => {
  const y = Number(year);
  const m = Number(month);

  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error('A valid year and month are required');
  }

  const results = [];
  for (const item of budgets) {
    if (!item || !item.category) continue;
    const res = await setBudget({
      year: y,
      month: m,
      category: item.category,
      amount: item.amount,
    });
    results.push(res);
  }

  return results;
};

export const getBudgetsForMonth = async (year, month) => {
  const y = Number(year);
  const m = Number(month);

  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error('A valid year and month are required');
  }

  const records = await prisma.budget.findMany({
    where: { year: y, month: m },
  });

  const allBudgetRecord = records.find((b) => b.category === 'ALL');
  const allBudget = allBudgetRecord ? allBudgetRecord.amount : 0;
  const categoryBudgets = records.filter((b) => b.category !== 'ALL');
  const totalCategoryBudget = categoryBudgets.reduce((sum, b) => sum + b.amount, 0);

  return {
    year: y,
    month: m,
    allBudget,
    totalCategoryBudget,
    effectiveBudget: totalCategoryBudget > 0 ? totalCategoryBudget : allBudget,
    records,
  };
};

export const budgetService = {
  setBudget,
  setBatchBudgets,
  getBudgetsForMonth,
};
