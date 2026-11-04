import { prisma } from '../config/prisma.js';

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
  async create({ person, description, amount, lentDate }) {
    const value = Number(amount);
    if (!person?.trim()) throw new Error('Person is required');
    if (!Number.isFinite(value) || value <= 0) throw new Error('Loan amount must be positive');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lentDate || '')) throw new Error('A valid loan date is required');
    return withBalance(await prisma.debt.create({ data: { person: person.trim(), description: description?.trim() || null, amount: value, lentDate }, include: includeRepayments }));
  },
  async addRepayment(id, { amount, date, note }) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) throw new Error('Repayment amount must be positive');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('A valid repayment date is required');
    const debt = await prisma.debt.findUnique({ where: { id }, include: includeRepayments });
    if (!debt) throw new Error('Debt not found');
    const outstanding = debt.amount - debt.repayments.reduce((sum, item) => sum + item.amount, 0);
    if (value > outstanding + 0.001) throw new Error('Repayment cannot exceed the outstanding amount');
    const updated = await prisma.debt.update({ where: { id }, data: { repayments: { create: { amount: value, date, note: note?.trim() || null } } }, include: includeRepayments });
    return withBalance(updated);
  },
};
