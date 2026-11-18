import { prisma } from '../config/prisma.js';
import { currentUserId } from '../config/prisma.js';

const includeRepayments = { repayments: { orderBy: { date: 'asc' } } };

const withBalance = (debt) => {
  const repaidAmount = debt.repayments.reduce((sum, item) => sum + item.amount, 0);
  return { ...debt, repaidAmount, outstandingAmount: Math.max(0, debt.amount - repaidAmount), isPaid: repaidAmount >= debt.amount };
};

export const debtService = {
  async list() {
    const debts = await prisma.debt.findMany({ include: includeRepayments, orderBy: { lentDate: 'desc' } });
    return debts.map(withBalance);
  },
  async create({ person, description, amount, lentDate, sourceTransactionId }) {
    const value = Number(amount);
    if (!person?.trim()) throw new Error('Person is required');
    if (!Number.isFinite(value) || value <= 0) throw new Error('Loan amount must be positive');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lentDate || '')) throw new Error('A valid loan date is required');
    let sourceTransaction = null;
    if (sourceTransactionId) {
      sourceTransaction = await prisma.transaction.findUnique({ where: { id: sourceTransactionId } });
      if (!sourceTransaction || sourceTransaction.type !== 'expense' || sourceTransaction.excludeFromReport || sourceTransaction.isTransfer || sourceTransaction.refundForId) throw new Error('Choose an unlinked expense transaction for this loan');
      if (Math.abs(sourceTransaction.amount - value) > 0.01) throw new Error('Loan amount must match the linked bank transaction');
      const alreadyLinked = await prisma.debt.findFirst({ where: { sourceTransactionId } });
      if (alreadyLinked) throw new Error('This transaction is already linked to a loan');
    }
    return prisma.$transaction(async (db) => {
      if (sourceTransaction) await db.transaction.update({ where: { id: sourceTransaction.id }, data: { excludeFromReport: true } });
      const debt = await db.debt.create({ data: { person: person.trim(), description: description?.trim() || null, amount: value, lentDate, sourceTransactionId: sourceTransaction?.id || null }, include: includeRepayments });
      return withBalance(debt);
    });
  },
  async addRepayment(id, { amount, date, note, transactionId }) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) throw new Error('Repayment amount must be positive');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('A valid repayment date is required');
    const debt = await prisma.debt.findUnique({ where: { id }, include: includeRepayments });
    if (!debt) throw new Error('Debt not found');
    const outstanding = debt.amount - debt.repayments.reduce((sum, item) => sum + item.amount, 0);
    if (value > outstanding + 0.001) throw new Error('Repayment cannot exceed the outstanding amount');
    let repaymentTransaction = null;
    if (transactionId) {
      repaymentTransaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
      if (!repaymentTransaction || repaymentTransaction.type !== 'income' || repaymentTransaction.excludeFromReport || repaymentTransaction.refundForId || repaymentTransaction.isTransfer) throw new Error('Choose an unlinked income transaction for this repayment');
      if (Math.abs(repaymentTransaction.amount - value) > 0.01) throw new Error('Repayment amount must match the linked bank transaction');
      if (await prisma.debtRepayment.findFirst({ where: { transactionId } })) throw new Error('This transaction is already linked to a repayment');
    }
    const updated = await prisma.$transaction(async (db) => {
      if (repaymentTransaction) await db.transaction.update({ where: { id: repaymentTransaction.id }, data: { excludeFromReport: true } });
      return db.debt.update({ where: { id }, data: { repayments: { create: { userId: currentUserId(), amount: value, date, note: note?.trim() || null, transactionId: repaymentTransaction?.id || null } } }, include: includeRepayments });
    });
    return withBalance(updated);
  },
};
