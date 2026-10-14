import { prisma } from '../config/prisma.js';

export const getBudget = async (year, month) => {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);

  const budget = await prisma.budget.findUnique({
    where: {
      year_month: {
        year: y,
        month: m,
      },
    },
  });

  return budget || { year: y, month: m, amount: 0 };
};

export const setBudget = async (year, month, amount) => {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const amt = parseFloat(amount) || 0;

  return prisma.budget.upsert({
    where: {
      year_month: {
        year: y,
        month: m,
      },
    },
    update: {
      amount: amt,
    },
    create: {
      year: y,
      month: m,
      amount: amt,
    },
  });
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
