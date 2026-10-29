import { prisma } from '../config/prisma.js';
import { ruleService } from './rule.service.js';

export const getAllTransactions = async (filters = {}) => {
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

export const createTransaction = async (data) => {
  const {
    date,
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
      description: description.trim(),
      remarks: remarks && remarks.trim() ? remarks.trim() : null,
      category: category.trim(),
      group: group && group.trim() ? group.trim() : null,
      amount: parsedAmount,
      type,
      account: account.trim(),
      reference: manualRef,
      balance: balance !== undefined && !isNaN(parseFloat(balance)) ? parseFloat(balance) : null,
      needsReview: Boolean(needsReview),
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

export const updateTransaction = async (id, data) => {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Transaction not found');
  }

  const updateData = {};
  if (data.category !== undefined) {
    updateData.category = String(data.category).trim();
    // If user edited category from 'Needs review', mark review resolved
    if (updateData.category !== 'Needs review') {
      updateData.needsReview = false;
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
    updateData.amount = amt;
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

  return prisma.transaction.update({
    where: { id },
    data: updateData,
  });
};

export const getTransactionSummary = async () => {
  // Exclude internal transfers marked as excludeFromReport
  const transactions = await prisma.transaction.findMany({
    where: { excludeFromReport: false },
  });
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  return {
    totalIncome: income,
    totalExpenses: expense,
    balance: income - expense,
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
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  // 1. Totals (Transfers excluded)
  const totalIncome = txs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = txs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  // 2. Category Breakdown for Pie Chart (Expenses)
  const catMap = {};
  for (const t of txs) {
    if (t.type === 'expense') {
      const cat = t.category || 'Other';
      if (!catMap[cat]) {
        catMap[cat] = { name: cat, value: 0, count: 0 };
      }
      catMap[cat].value += t.amount;
      catMap[cat].count += 1;
    }
  }

  const categoryBreakdown = Object.values(catMap)
    .map((c) => ({
      ...c,
      value: Math.round(c.value * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((c.value / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // 3. Time Series for Bar Chart
  const timeMap = {};
  const isSingleMonth = month && month !== 'all' && (!date || date === 'all');
  const isSingleDay = date && date !== 'all';

  if (isSingleDay) {
    for (const t of txs) {
      const label = t.category || 'Other';
      if (!timeMap[label]) {
        timeMap[label] = { label, income: 0, expense: 0 };
      }
      if (t.type === 'income') timeMap[label].income += t.amount;
      if (t.type === 'expense') timeMap[label].expense += t.amount;
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
      if (t.type === 'income') timeMap[label].income += t.amount;
      if (t.type === 'expense') timeMap[label].expense += t.amount;
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
      if (t.type === 'income') timeMap[label].income += t.amount;
      if (t.type === 'expense') timeMap[label].expense += t.amount;
    }
  }

  const timeSeries = Object.values(timeMap).map((entry) => ({
    ...entry,
    income: Math.round(entry.income * 100) / 100,
    expense: Math.round(entry.expense * 100) / 100,
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
    const catIncome = catTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const catExpense = catTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const catBudget = budgetRecordsMap.get(cat.name) || 0;
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
  const totalCategoryBudget = categoryFinancials.reduce((sum, c) => sum + c.budgetAmount, 0);
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
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      count: txs.length,
    },
    budget: {
      category: 'ALL',
      budgetAmount: Math.round(effectiveOverallBudget * 100) / 100,
      actualAmount: Math.round(totalExpenses * 100) / 100,
      incomeAmount: Math.round(totalIncome * 100) / 100,
      expenseAmount: Math.round(totalExpenses * 100) / 100,
      incomeTransactionCount: txs.filter((t) => t.type === 'income').length,
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

export const transactionService = {
  getAll: getAllTransactions,
  create: createTransaction,
  update: updateTransaction,
  delete: deleteTransaction,
  getSummary: getTransactionSummary,
  getAnalytics: getTransactionAnalytics,
};
