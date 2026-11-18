import { prisma } from '../config/prisma.js';
import { ruleService } from './rule.service.js';

export const getAllTransactions = async (filters = {}) => {
  await prisma.transaction.updateMany({
    where: { category: { equals: 'Refund', mode: 'insensitive' }, type: 'income', refundForId: null, needsReview: false },
    data: { needsReview: true },
  });
  const where = {};

  if (filters.category && filters.category !== 'All') {
    where.category = filters.category;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.account) {
    where.account = filters.account;
  }

  if (filters.needsReview !== undefined && filters.needsReview !== 'all') {
    where.needsReview = filters.needsReview === 'true' || filters.needsReview === true;
  }

  if (filters.isTransfer !== undefined && filters.isTransfer !== 'all') {
    where.isTransfer = filters.isTransfer === 'true' || filters.isTransfer === true;
  }

  if (filters.excludeFromReport !== undefined && filters.excludeFromReport !== 'all') {
    where.excludeFromReport = filters.excludeFromReport === 'true' || filters.excludeFromReport === true;
  }

  // Date-based filters
  if (filters.date && filters.date !== 'all') {
    where.date = filters.date;
  } else if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = filters.startDate;
    if (filters.endDate) where.date.lte = filters.endDate;
  } else if (filters.year && filters.year !== 'all') {
    if (filters.month && filters.month !== 'all') {
      const mStr = String(filters.month).padStart(2, '0');
      where.date = { startsWith: `${filters.year}-${mStr}` };
    } else {
      where.date = { startsWith: `${filters.year}` };
    }
  }

  if (filters.search) {
    const searchTerm = String(filters.search).trim();
    if (searchTerm) {
      where.OR = [
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { remarks: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
        { group: { contains: searchTerm, mode: 'insensitive' } },
        { account: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.max(1, parseInt(filters.limit, 10) || 10);
  const skip = (page - 1) * limit;

  const [total, transactions] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: transactionDetails,
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: transactions,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

const transactionDetails = {
  refunds: { select: { id: true, amount: true, date: true } },
  refundFor: { include: { splitShares: true } },
  splitShares: { include: { settlements: true } },
  debtDisbursement: true,
  debtRepayment: true,
};

export const createTransaction = async (data) => {
  const {
    date,
    time,
    description,
    remarks,
    category,
    group,
    amount,
    type,
    account,
    reference,
    balance,
    needsReview = false,
    isTransfer = false,
    excludeFromReport = false,
  } = data;

  if (!date) throw new Error('Transaction date is required');
  if (!description || !description.trim()) throw new Error('Transaction description is required');
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Transaction amount must be a positive number');
  }
  if (!type || !['expense', 'income'].includes(type)) {
    throw new Error('Transaction type must be either expense or income');
  }
  if (!category || !category.trim()) throw new Error('Category is required');
  if (!account || !account.trim()) throw new Error('Account is required');

  const manualRef = reference && reference.trim()
    ? reference.trim()
    : `MANUAL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const isTransferCategory = category.trim().toLowerCase() === 'transfer' || Boolean(isTransfer);

  return prisma.transaction.create({
    data: {
      date: date.trim(),
      time: time && String(time).trim() ? String(time).trim() : null,
      description: description.trim(),
      remarks: remarks && remarks.trim() ? remarks.trim() : null,
      category: category.trim(),
      group: group && group.trim() ? group.trim() : null,
      amount: parsedAmount,
      type,
      account: account.trim(),
      reference: manualRef,
      balance: balance !== undefined && !isNaN(parseFloat(balance)) ? parseFloat(balance) : null,
      needsReview: Boolean(needsReview || (type === 'income' && category.trim().toLowerCase() === 'refund')),
      confidence: 'manual',
      isTransfer: isTransferCategory,
      excludeFromReport: Boolean(excludeFromReport || isTransferCategory),
    },
  });
};

export const deleteTransaction = async (id) => {
  return prisma.transaction.delete({
    where: { id },
  });
};

const normalizeSplitShares = (shares, transactionAmount) => {
  if (!Array.isArray(shares) || shares.length < 2) throw new Error('A split needs your share and at least one friend');
  const normalized = shares.map((share) => ({
    participant: String(share.participant || '').trim(),
    amount: Number(share.amount),
    isSelf: Boolean(share.isSelf),
  }));
  if (normalized.some((share) => !share.participant || !Number.isFinite(share.amount) || share.amount < 0)) {
    throw new Error('Each split needs a participant and a valid non-negative amount');
  }
  if (normalized.filter((share) => share.isSelf).length !== 1) throw new Error('A split must contain exactly one “You” share');
  if (normalized.some((share) => !share.isSelf && share.amount <= 0)) throw new Error('Friend shares must be greater than zero');
  const names = normalized.map((share) => share.participant.toLowerCase());
  if (new Set(names).size !== names.length) throw new Error('Participant names must be unique in this split');
  const total = roundMoney(normalized.reduce((sum, share) => sum + share.amount, 0));
  if (Math.abs(total - transactionAmount) > 0.001) throw new Error('Split shares must add up to the transaction amount');
  return normalized;
};

const replaceSplitShares = async (db, transactionId, existingShares, normalizedShares) => {
  const existingByName = new Map(existingShares.map((share) => [share.participant.toLowerCase(), share]));
  const keepNames = new Set(normalizedShares.map((share) => share.participant.toLowerCase()));
  for (const existing of existingShares) {
    if (!keepNames.has(existing.participant.toLowerCase())) {
      await db.transactionSplitShare.delete({ where: { id: existing.id } });
    }
  }
  for (const share of normalizedShares) {
    const existing = existingByName.get(share.participant.toLowerCase());
    if (existing) {
      await db.transactionSplitShare.update({
        where: { id: existing.id },
        data: { amount: share.amount, participant: share.participant, isSelf: share.isSelf },
      });
    } else {
      await db.transactionSplitShare.create({ data: { transactionId, ...share } });
    }
  }
};

export const updateTransaction = async (id, data) => {
  const existing = await prisma.transaction.findUnique({
    where: { id },
    include: { splitShares: { include: { settlements: true } }, refunds: true },
  });
  if (!existing) {
    throw new Error('Transaction not found');
  }

  const updateData = {};
  let newAmount = existing.amount;
  let normalizedShares = null;
  if (data.category !== undefined) {
    updateData.category = String(data.category).trim();
    if (updateData.category !== 'Needs review') {
      updateData.needsReview = updateData.category.toLowerCase() === 'refund' && existing.type === 'income';
      updateData.confidence = 'manual';
    }
  }
  if (data.group !== undefined) {
    updateData.group = data.group && String(data.group).trim() ? String(data.group).trim() : null;
  }
  if (data.description !== undefined) {
    updateData.description = String(data.description).trim();
  }
  if (data.remarks !== undefined) {
    updateData.remarks = data.remarks && String(data.remarks).trim() ? String(data.remarks).trim() : null;
  }
  if (data.amount !== undefined) {
    const amt = parseFloat(data.amount);
    if (isNaN(amt) || amt <= 0) {
      throw new Error('Transaction amount must be a positive number');
    }
    newAmount = amt;
    updateData.amount = amt;
  }
  const amountChanged = Math.abs(newAmount - existing.amount) > 0.001;
  if (existing.refunds.length && amountChanged) throw new Error('Unlink or reallocate refunds before changing this purchase amount.');
  if (existing.splitShares.length && amountChanged && !Array.isArray(data.shares)) {
    throw new Error('Update the split shares so they add up to the new transaction amount.');
  }
  if (data.shares !== undefined) {
    if (!existing.splitShares.length) throw new Error('Use the split action before editing split allocations.');
    normalizedShares = normalizeSplitShares(data.shares, newAmount);
    const existingByName = new Map(existing.splitShares.map((share) => [share.participant.toLowerCase(), share]));
    if (existing.refunds.length && normalizedShares.some((share) => {
      const current = existingByName.get(share.participant.toLowerCase());
      return !current || Math.abs(current.amount - share.amount) > 0.001 || current.isSelf !== share.isSelf;
    })) throw new Error('Split shares cannot change while refunds are linked. Unlink refunds first.');
    const keepNames = new Set(normalizedShares.map((share) => share.participant.toLowerCase()));
    for (const current of existing.splitShares) {
      if (!keepNames.has(current.participant.toLowerCase()) && current.settlements?.length) {
        throw new Error(`Cannot remove ${current.participant}; they have settlement history. Set their share to zero instead.`);
      }
    }
  }
  if (data.type !== undefined) {
    if (!['expense', 'income'].includes(data.type)) {
      throw new Error('Transaction type must be either expense or income');
    }
    updateData.type = data.type;
  }
  if (data.account !== undefined) {
    updateData.account = String(data.account).trim();
  }
  if (data.date !== undefined) {
    updateData.date = String(data.date).trim();
  }
  if (data.time !== undefined) {
    updateData.time = data.time && String(data.time).trim() ? String(data.time).trim() : null;
  }
  if (data.reference !== undefined) {
    updateData.reference = data.reference && String(data.reference).trim()
      ? String(data.reference).trim()
      : null;
  }
  if (data.balance !== undefined) {
    updateData.balance = data.balance !== null && !isNaN(parseFloat(data.balance)) ? parseFloat(data.balance) : null;
  }
  if (data.needsReview !== undefined) {
    updateData.needsReview = Boolean(data.needsReview);
  }
  if (data.isTransfer !== undefined) {
    updateData.isTransfer = Boolean(data.isTransfer);
  }
  if (data.excludeFromReport !== undefined) {
    updateData.excludeFromReport = Boolean(data.excludeFromReport);
  }
  if (data.transferStatus !== undefined) {
    updateData.transferStatus = data.transferStatus;
  }

  // Optionally save user-approved pattern as a reusable rule (Section 5.4)
  if (data.saveAsRule && data.rulePattern) {
    try {
      await ruleService.create({
        pattern: data.rulePattern.trim(),
        matchType: data.ruleMatchType || 'contains',
        category: updateData.category || existing.category,
        group: updateData.group || existing.group,
        priority: Number(data.rulePriority) || 60,
        bank: data.ruleBank || 'ALL',
        isUserCreated: true,
      });
    } catch (ruleErr) {
      console.warn('Could not save user-approved rule:', ruleErr.message);
    }
  }

  if (!normalizedShares) return prisma.transaction.update({ where: { id }, data: updateData });
  return prisma.$transaction(async (db) => {
    await replaceSplitShares(db, id, existing.splitShares, normalizedShares);
    return db.transaction.update({ where: { id }, data: updateData, include: transactionDetails });
  });
};

const isRefund = (transaction) => Boolean(transaction.refundForId) || transaction.category?.trim().toLowerCase() === 'refund';
const ownExpenseShare = (transaction) => {
  const ownShare = transaction.splitShares?.find((share) => share.isSelf);
  return ownShare ? ownShare.amount : transaction.amount;
};
const refundOwnShare = (refund) => {
  const original = refund.refundFor;
  if (!original?.amount) return refund.amount;
  return refund.amount * (ownExpenseShare(original) / original.amount);
};
const roundMoney = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

export const getTransactionSummary = async () => {
  const transactions = await prisma.transaction.findMany({ where: { excludeFromReport: false }, include: transactionDetails });
  const totalIncome = transactions.reduce((sum, transaction) => {
    return transaction.type === 'income' && !isRefund(transaction) ? sum + transaction.amount : sum;
  }, 0);
  const totalExpenses = transactions.reduce((sum, transaction) => {
    if (transaction.type === 'expense') return sum + ownExpenseShare(transaction);
    if (transaction.refundForId) return sum - refundOwnShare(transaction);
    return sum;
  }, 0);
  return {
    totalIncome: roundMoney(totalIncome),
    totalExpenses: roundMoney(totalExpenses),
    balance: roundMoney(totalIncome - totalExpenses),
    count: transactions.length,
  };
};

export const getTransactionAnalytics = async (filters = {}) => {
  const { year, month, date } = filters;
  const where = {
    excludeFromReport: false, // Internal transfers excluded from spending and income totals
  };

  if (date && date !== 'all') {
    where.date = date;
  } else if (year && year !== 'all' && month && month !== 'all') {
    const mStr = String(month).padStart(2, '0');
    where.date = { startsWith: `${year}-${mStr}` };
  } else if (year && year !== 'all') {
    where.date = { startsWith: `${year}` };
  }

  const [txs, allCategories] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'asc' },
      include: transactionDetails,
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  // Refund credits reduce expense on the credit date and never increase income.
  // Split expenses include only the current user's own allocation.
  const categoryTotals = new Map();
  let totalIncome = 0;
  let totalExpenses = 0;
  const addCategoryAmount = (name, amount) => categoryTotals.set(name, (categoryTotals.get(name) || 0) + amount);
  for (const transaction of txs) {
    if (transaction.type === 'expense') {
      const ownAmount = ownExpenseShare(transaction);
      totalExpenses += ownAmount;
      addCategoryAmount(transaction.category || 'Other', ownAmount);
    } else if (transaction.refundForId) {
      const reduction = refundOwnShare(transaction);
      totalExpenses -= reduction;
      addCategoryAmount(transaction.refundFor?.category || 'Other', -reduction);
    } else if (transaction.type === 'income' && !isRefund(transaction)) {
      totalIncome += transaction.amount;
    }
  }
  const balance = totalIncome - totalExpenses;

  // Category chart includes the net refund reduction under its original category.
  const categoryBreakdown = Array.from(categoryTotals, ([name, value]) => ({
      name,
      value: roundMoney(value),
      count: txs.filter((t) => t.category === name && t.type === 'expense').length,
      percentage: totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0,
    }))
    .filter((item) => item.value !== 0)
    .sort((a, b) => b.value - a.value);

  // 3. Time Series for Bar Chart
  const timeMap = {};
  const isSingleMonth = month && month !== 'all' && (!date || date === 'all');
  const isSingleDay = date && date !== 'all';

  if (isSingleDay) {
    for (const t of txs) {
      const label = t.refundFor?.category || t.category || 'Other';
      if (!timeMap[label]) {
        timeMap[label] = { label, income: 0, expense: 0 };
      }
      if (t.type === 'income' && !isRefund(t)) timeMap[label].income += t.amount;
      if (t.type === 'expense') timeMap[label].expense += ownExpenseShare(t);
      if (t.refundForId) timeMap[label].expense -= refundOwnShare(t);
    }
  } else if (isSingleMonth) {
    for (const t of txs) {
      const d = t.date;
      const day = d.substring(8, 10);
      const m = d.substring(5, 7);
      const label = `${day}/${m}`;
      if (!timeMap[label]) {
        timeMap[label] = { label, date: d, income: 0, expense: 0 };
      }
      if (t.type === 'income' && !isRefund(t)) timeMap[label].income += t.amount;
      if (t.type === 'expense') timeMap[label].expense += ownExpenseShare(t);
      if (t.refundForId) timeMap[label].expense -= refundOwnShare(t);
    }
  } else {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const t of txs) {
      const d = t.date;
      const y = d.substring(0, 4);
      const mIdx = parseInt(d.substring(5, 7), 10) - 1;
      const label = `${monthNames[mIdx] || d.substring(5, 7)} ${y}`;
      if (!timeMap[label]) {
        timeMap[label] = { label, sortKey: d.substring(0, 7), income: 0, expense: 0 };
      }
      if (t.type === 'income' && !isRefund(t)) timeMap[label].income += t.amount;
      if (t.type === 'expense') timeMap[label].expense += ownExpenseShare(t);
      if (t.refundForId) timeMap[label].expense -= refundOwnShare(t);
    }
  }

  const timeSeries = Object.values(timeMap).map((entry) => ({
    ...entry,
    income: roundMoney(entry.income),
    expense: roundMoney(entry.expense),
  }));

  // 4. Budget & Category Financials for Expand/Collapse Dashboard Cards
  let monthlyAllBudget = 0;
  const budgetRecordsMap = new Map();

  if (year && year !== 'all' && month && month !== 'all') {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const records = await prisma.budget.findMany({
      where: { year: y, month: m },
    });
    for (const r of records) {
      if (r.category === 'ALL') {
        monthlyAllBudget = r.amount;
      } else {
        budgetRecordsMap.set(r.category, r.amount);
      }
    }
  }

  // Compute category-level financials across all master categories
  const categoryFinancials = allCategories.map((cat) => {
    const catTxs = txs.filter((t) => t.category.toLowerCase() === cat.name.toLowerCase());
    const catIncome = catTxs.filter((t) => t.type === 'income' && !isRefund(t)).reduce((sum, t) => sum + t.amount, 0);
    const catExpense = categoryTotals.get(cat.name) || 0;
    // Monthly budgets are for spending categories only. Income and transfer
    // categories remain visible in their transaction breakdowns, but never
    // contribute to budget totals or remaining amounts.
    const catBudget = cat.type === 'expense' ? (budgetRecordsMap.get(cat.name) || 0) : 0;
    const catRemaining = Math.max(0, catBudget - catExpense);
    const catOverBudget = catExpense > catBudget && catBudget > 0 ? catExpense - catBudget : 0;
    const catPercentage = catBudget > 0 ? Math.min(100, Math.round((catExpense / catBudget) * 100)) : 0;

    return {
      categoryId: cat.id,
      category: cat.name,
      type: cat.type,
      budgetAmount: Math.round(catBudget * 100) / 100,
      incomeAmount: Math.round(catIncome * 100) / 100,
      expenseAmount: Math.round(catExpense * 100) / 100,
      remainingBudget: Math.round(catRemaining * 100) / 100,
      overBudget: Math.round(catOverBudget * 100) / 100,
      percentageSpent: catPercentage,
      transactionCount: catTxs.length,
    };
  });

  // Tally Rule (as requested by user):
  // Sum of all category budgets = totalCategoryBudget
  // If user provided values for categories, overall monthly budget is totalCategoryBudget
  // If they didn't give any category values, monthlyAllBudget is taken
  const totalCategoryBudget = categoryFinancials
    .filter((c) => c.type === 'expense')
    .reduce((sum, c) => sum + c.budgetAmount, 0);
  const effectiveOverallBudget = totalCategoryBudget > 0 ? totalCategoryBudget : monthlyAllBudget;
  const isTalliedFromCategories = totalCategoryBudget > 0;

  const overallRemaining = Math.max(0, effectiveOverallBudget - totalExpenses);
  const overallOverBudget = totalExpenses > effectiveOverallBudget && effectiveOverallBudget > 0 ? totalExpenses - effectiveOverallBudget : 0;
  const overallPercentage = effectiveOverallBudget > 0 ? Math.min(100, Math.round((totalExpenses / effectiveOverallBudget) * 100)) : 0;

  // 5. Distinct dates in database for filter dropdowns
  const allDates = await prisma.transaction.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });

  const yearsSet = new Set();
  const monthsSet = new Set();
  const datesList = [];

  for (const item of allDates) {
    if (item.date && item.date.length >= 10) {
      yearsSet.add(item.date.substring(0, 4));
      monthsSet.add(item.date.substring(5, 7));
      datesList.push(item.date);
    }
  }

  return {
    summary: {
      totalIncome: roundMoney(totalIncome),
      totalExpenses: roundMoney(totalExpenses),
      balance: roundMoney(balance),
      count: txs.length,
    },
    budget: {
      category: 'ALL',
      budgetAmount: Math.round(effectiveOverallBudget * 100) / 100,
      actualAmount: Math.round(totalExpenses * 100) / 100,
      incomeAmount: Math.round(totalIncome * 100) / 100,
      expenseAmount: Math.round(totalExpenses * 100) / 100,
      incomeTransactionCount: txs.filter((t) => t.type === 'income' && !isRefund(t)).length,
      expenseTransactionCount: txs.filter((t) => t.type === 'expense').length,
      transactionCount: txs.length,
      remainingBudget: Math.round(overallRemaining * 100) / 100,
      overBudget: Math.round(overallOverBudget * 100) / 100,
      percentageSpent: overallPercentage,
      totalCategoryBudget: Math.round(totalCategoryBudget * 100) / 100,
      monthlyAllBudget: Math.round(monthlyAllBudget * 100) / 100,
      isTalliedFromCategories,
    },
    categoryFinancials,
    categoryBreakdown,
    timeSeries,
    filters: {
      availableYears: Array.from(yearsSet).sort(),
      availableMonths: Array.from(monthsSet).sort(),
      availableDates: datesList,
    },
  };
};

export const getRefundCandidates = async (refundId) => {
  const refund = await prisma.transaction.findUnique({ where: { id: refundId } });
  if (!refund || refund.type !== 'income') throw new Error('Refund transaction not found');
  const expenses = await prisma.transaction.findMany({
    where: { type: 'expense', excludeFromReport: false },
    include: { refunds: true },
    orderBy: { date: 'desc' },
  });
  return expenses
    .map((expense) => ({ ...expense, refundableAmount: roundMoney(expense.amount - expense.refunds.reduce((sum, item) => sum + item.amount, 0)) }))
    .filter((expense) => expense.refundableAmount > 0)
    .map(({ refunds: _refunds, ...expense }) => expense);
};

export const linkRefund = async (refundId, originalId) => {
  const refund = await prisma.transaction.findUnique({ where: { id: refundId } });
  if (!refund || refund.type !== 'income') throw new Error('Refund must be an income transaction');
  if (!originalId) return prisma.transaction.update({ where: { id: refundId }, data: { refundForId: null, category: 'Refund', needsReview: true } });
  const original = await prisma.transaction.findUnique({ where: { id: originalId }, include: { refunds: true } });
  if (!original || original.type !== 'expense' || original.excludeFromReport) throw new Error('Choose a reportable expense purchase');
  if (refund.id === original.id) throw new Error('A refund cannot be linked to itself');
  const alreadyRefunded = original.refunds.filter((item) => item.id !== refundId).reduce((sum, item) => sum + item.amount, 0);
  if (alreadyRefunded + refund.amount > original.amount + 0.001) throw new Error('Refund total cannot exceed the original purchase amount');
  return prisma.transaction.update({
    where: { id: refundId },
    data: { refundForId: originalId, category: 'Refund', needsReview: false, confidence: 'manual' },
    include: transactionDetails,
  });
};

export const saveTransactionSplit = async (transactionId, shares) => {
  if (!Array.isArray(shares) || shares.length < 2) throw new Error('A split needs your share and at least one friend');
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId }, include: { splitShares: { include: { settlements: true } }, refunds: true } });
  if (!transaction || transaction.type !== 'expense' || transaction.excludeFromReport || transaction.refundForId) throw new Error('Only reportable expense transactions can be split');
  const normalized = shares.map((share) => ({
    participant: String(share.participant || '').trim(),
    amount: Number(share.amount),
    isSelf: Boolean(share.isSelf),
  }));
  if (normalized.some((share) => !share.participant || !Number.isFinite(share.amount) || share.amount < 0)) throw new Error('Each split needs a participant and a valid non-negative amount');
  if (normalized.filter((share) => share.isSelf).length !== 1) throw new Error('A split must contain exactly one “You” share');
  if (normalized.some((share) => !share.isSelf && share.amount <= 0)) throw new Error('Friend shares must be greater than zero');
  const uniqueNames = normalized.map((share) => share.participant.toLowerCase());
  if (new Set(uniqueNames).size !== uniqueNames.length) throw new Error('Participant names must be unique in this split');
  const total = roundMoney(normalized.reduce((sum, share) => sum + share.amount, 0));
  if (Math.abs(total - transaction.amount) > 0.01) throw new Error('Split shares must add up to the transaction amount');

  const existingByName = new Map(transaction.splitShares.map((share) => [share.participant.toLowerCase(), share]));
  if (transaction.refunds.length && normalized.some((share) => {
    const existing = existingByName.get(share.participant.toLowerCase());
    return !existing || Math.abs(existing.amount - share.amount) > 0.001 || existing.isSelf !== share.isSelf;
  })) throw new Error('Split shares cannot change while refunds are linked. Unlink refunds first.');
  const keepNames = new Set(uniqueNames);
  for (const existing of transaction.splitShares) {
    if (!keepNames.has(existing.participant.toLowerCase()) && existing.settlements.length) {
      throw new Error(`Cannot remove ${existing.participant}; they have settlement history. Set their share to zero instead.`);
    }
  }
  return prisma.$transaction(async (db) => {
    for (const existing of transaction.splitShares) {
      if (!keepNames.has(existing.participant.toLowerCase())) await db.transactionSplitShare.delete({ where: { id: existing.id } });
    }
    for (const share of normalized) {
      const existing = existingByName.get(share.participant.toLowerCase());
      if (existing) await db.transactionSplitShare.update({ where: { id: existing.id }, data: { amount: share.amount, participant: share.participant, isSelf: share.isSelf } });
      else await db.transactionSplitShare.create({ data: { transactionId, participant: share.participant, amount: share.amount, isSelf: share.isSelf } });
    }
    return db.transaction.findUnique({ where: { id: transactionId }, include: transactionDetails });
  });
};

const splitShareBalance = (share) => {
  const refundTotal = share.transaction.refunds.reduce((sum, refund) => sum + refund.amount, 0);
  const refundShare = share.transaction.amount > 0 ? refundTotal * (share.amount / share.transaction.amount) : 0;
  const received = share.settlements.filter((item) => item.direction === 'fromFriend').reduce((sum, item) => sum + item.amount, 0);
  const returned = share.settlements.filter((item) => item.direction === 'toFriend').reduce((sum, item) => sum + item.amount, 0);
  return roundMoney(share.amount - refundShare - received + returned);
};

export const getSplitReceivables = async () => {
  const shares = await prisma.transactionSplitShare.findMany({
    where: { isSelf: false },
    include: { transaction: { include: { refunds: true } }, settlements: { orderBy: { date: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return shares.map((share) => ({ ...share, balanceDue: splitShareBalance(share) }));
};

export const settleSplitShare = async (shareId, { amount, date, note, direction = 'fromFriend' }) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Settlement amount must be positive');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('A valid settlement date is required');
  if (!['fromFriend', 'toFriend'].includes(direction)) throw new Error('Invalid settlement direction');
  const share = await prisma.transactionSplitShare.findUnique({
    where: { id: shareId },
    include: { transaction: { include: { refunds: true } }, settlements: true },
  });
  if (!share || share.isSelf) throw new Error('Friend share not found');
  const balance = splitShareBalance(share);
  if (direction === 'fromFriend' && (balance <= 0 || value > balance + 0.001)) throw new Error('Amount exceeds what this friend currently owes');
  if (direction === 'toFriend' && (balance >= 0 || value > Math.abs(balance) + 0.001)) throw new Error('Amount exceeds the credit currently owed to this friend');
  return prisma.splitSettlement.create({ data: { shareId, amount: value, date, note: note?.trim() || null, direction } });
};

export const transactionService = {
  getAll: getAllTransactions,
  create: createTransaction,
  update: updateTransaction,
  delete: deleteTransaction,
  getSummary: getTransactionSummary,
  getAnalytics: getTransactionAnalytics,
  getRefundCandidates,
  linkRefund,
  saveSplit: saveTransactionSplit,
  getSplitReceivables,
  settleSplitShare,
};
