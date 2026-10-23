import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../src/config/prisma.js';
import { getTransactionAnalytics } from '../src/services/transaction.service.js';

test('monthly and master-category budgets use matching transactions', async () => {
  const originalFindMany = prisma.transaction.findMany;
  const originalFindUnique = prisma.budget.findUnique;
  const originalCategoryFindUnique = prisma.category.findUnique;
  const transactions = [
    { date: '2026-10-02', type: 'expense', category: 'Food', amount: 25 },
    { date: '2026-10-03', type: 'expense', category: 'Food', amount: 15 },
    { date: '2026-10-04', type: 'expense', category: 'Travel', amount: 60 },
    { date: '2026-10-05', type: 'income', category: 'Salary', amount: 200 },
    { date: '2026-10-06', type: 'income', category: 'Food', amount: 10 },
    { date: '2026-10-07', type: 'expense', category: 'Salary', amount: 20 },
  ];
  const targets = { ALL: 150, Food: 70, Salary: 250 };

  try {
    prisma.transaction.findMany = async (query) => query.distinct
      ? transactions.map(({ date }) => ({ date }))
      : transactions;
    prisma.budget.findUnique = async ({ where }) => ({
      amount: targets[where.year_month_category.category],
    });
    prisma.category.findUnique = async ({ where }) => ({ type: where.name === 'Salary' ? 'income' : 'expense' });

    const monthly = await getTransactionAnalytics({ year: '2026', month: '10' });
    const food = await getTransactionAnalytics({ year: '2026', month: '10', budgetCategory: 'Food' });
    const salary = await getTransactionAnalytics({ year: '2026', month: '10', budgetCategory: 'Salary' });

    assert.deepEqual(
      [monthly.budget.actualAmount, monthly.budget.remainingBudget, monthly.budget.transactionCount],
      [120, 30, 4],
    );
    assert.deepEqual(
      [food.budget.actualAmount, food.budget.remainingBudget, food.budget.transactionCount],
      [40, 30, 2],
    );
    assert.deepEqual(
      [salary.budget.actualAmount, salary.budget.remainingBudget, salary.budget.transactionCount],
      [200, 50, 1],
    );
    assert.deepEqual(
      [food.budget.incomeAmount, food.budget.expenseAmount, food.budget.incomeTransactionCount, food.budget.expenseTransactionCount],
      [10, 40, 1, 2],
    );
    assert.deepEqual(
      [salary.budget.incomeAmount, salary.budget.expenseAmount, salary.budget.incomeTransactionCount, salary.budget.expenseTransactionCount],
      [200, 20, 1, 1],
    );
    assert.equal(salary.summary.totalIncome, 210);
    assert.equal(salary.summary.totalExpenses, 120);
  } finally {
    prisma.transaction.findMany = originalFindMany;
    prisma.budget.findUnique = originalFindUnique;
    prisma.category.findUnique = originalCategoryFindUnique;
    await prisma.$disconnect();
  }
});
