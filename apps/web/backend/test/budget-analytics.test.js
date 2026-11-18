import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma, runAsUser } from '../src/config/prisma.js';
import { getTransactionAnalytics, updateTransaction } from '../src/services/transaction.service.js';

test('analytics count only personal split spending and apply linked refunds without income', async () => {
  const originalTransactionFindMany = prisma.transaction.findMany;
  const originalCategoryFindMany = prisma.category.findMany;
  const originalBudgetFindMany = prisma.budget.findMany;
  const purchase = {
    id: 'purchase', date: '2026-10-02', type: 'expense', category: 'Travel', amount: 100,
    splitShares: [{ participant: 'You', amount: 40, isSelf: true }], refunds: [],
  };
  const transactions = [
    purchase,
    {
      id: 'linked-refund', date: '2026-10-03', type: 'income', category: 'Refund', amount: 20,
      refundForId: 'purchase', refundFor: purchase,
    },
    { id: 'unlinked-refund', date: '2026-10-04', type: 'income', category: 'Refund', amount: 10, refundForId: null },
    { id: 'salary', date: '2026-10-05', type: 'income', category: 'Salary', amount: 200 },
  ];

  try {
    prisma.transaction.findMany = async (query) => query.distinct
      ? [...new Set(transactions.map(({ date }) => date))].map((date) => ({ date }))
      : transactions;
    prisma.category.findMany = async () => [
      { id: 'travel', name: 'Travel', type: 'expense' },
      { id: 'salary', name: 'Salary', type: 'income' },
      { id: 'refund', name: 'Refund', type: 'income' },
    ];
    prisma.budget.findMany = async () => [];

    await runAsUser('test-user', async () => {
      const analytics = await getTransactionAnalytics({ year: '2026', month: '10' });
      assert.equal(analytics.summary.totalExpenses, 32);
      assert.equal(analytics.summary.totalIncome, 200);
      assert.deepEqual(analytics.categoryBreakdown.map(({ name, value }) => ({ name, value })), [
        { name: 'Travel', value: 32 },
      ]);
      assert.equal(analytics.timeSeries.reduce((sum, item) => sum + item.expense, 0), 32);
      assert.equal(analytics.timeSeries.reduce((sum, item) => sum + item.income, 0), 200);
      assert.equal(analytics.categoryFinancials.find(({ category }) => category === 'Travel').expenseAmount, 32);
    });
  } finally {
    prisma.transaction.findMany = originalTransactionFindMany;
    prisma.category.findMany = originalCategoryFindMany;
    prisma.budget.findMany = originalBudgetFindMany;
  }
});

test('editing a split total requires explicit shares that add up to the new amount', async () => {
  const originalFindUnique = prisma.transaction.findUnique;
  const originalTransaction = prisma.$transaction;
  const existing = {
    id: 'split-purchase', amount: 100, type: 'expense', refunds: [],
    splitShares: [
      { id: 'self', participant: 'You', amount: 60, isSelf: true, settlements: [] },
      { id: 'friend', participant: 'Alex', amount: 40, isSelf: false, settlements: [] },
    ],
  };
  const updatedShareAmounts = [];
  let updatedTransactionAmount;

  try {
    prisma.transaction.findUnique = async () => existing;
    prisma.$transaction = async (callback) => callback({
      transactionSplitShare: {
        delete: async () => {},
        update: async ({ data }) => { updatedShareAmounts.push(data.amount); },
        create: async () => {},
      },
      transaction: {
        update: async ({ data }) => {
          updatedTransactionAmount = data.amount;
          return { ...existing, ...data };
        },
      },
    });

    await runAsUser('test-user', async () => {
      await assert.rejects(
        updateTransaction('split-purchase', { amount: 130 }),
        /Update the split shares/,
      );
      await assert.rejects(
        updateTransaction('split-purchase', {
          amount: 130,
          shares: [
            { participant: 'You', amount: 70, isSelf: true },
            { participant: 'Alex', amount: 50, isSelf: false },
          ],
        }),
        /Split shares must add up/,
      );
      await updateTransaction('split-purchase', {
        amount: 130,
        shares: [
          { participant: 'You', amount: 70, isSelf: true },
          { participant: 'Alex', amount: 60, isSelf: false },
        ],
      });
    });

    assert.equal(updatedTransactionAmount, 130);
    assert.deepEqual(updatedShareAmounts, [70, 60]);
  } finally {
    prisma.transaction.findUnique = originalFindUnique;
    prisma.$transaction = originalTransaction;
  }
});
