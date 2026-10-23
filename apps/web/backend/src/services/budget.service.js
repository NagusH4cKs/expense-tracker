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
      throw new Error('Select a category from the category master');
    }
  }

  return prisma.budget.upsert({
    where: { year_month_category: key },
    update: { amount: parsedAmount },
    create: { ...key, amount: parsedAmount },
  });
};

export const budgetService = { setBudget };
