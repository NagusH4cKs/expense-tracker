import { prisma } from '../config/prisma.js';

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

    // Generate unique reference if none provided
    const manualRef = reference && reference.trim()
      ? reference.trim()
      : `MANUAL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

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
      },
    });
};

export const deleteTransaction = async (id) => {
    return prisma.transaction.delete({
      where: { id },
  });
};

export const getTransactionSummary = async () => {
    const transactions = await prisma.transaction.findMany();
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
    const where = {};

    if (date && date !== 'all') {
      where.date = date;
    } else if (year && year !== 'all' && month && month !== 'all') {
      const mStr = String(month).padStart(2, '0');
      where.date = { startsWith: `${year}-${mStr}` };
    } else if (year && year !== 'all') {
      where.date = { startsWith: `${year}` };
    }

    const txs = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // 1. Totals
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
      // Group by category on that day
      for (const t of txs) {
        const label = t.category || 'Other';
        if (!timeMap[label]) {
          timeMap[label] = { label, income: 0, expense: 0 };
        }
        if (t.type === 'income') timeMap[label].income += t.amount;
        if (t.type === 'expense') timeMap[label].expense += t.amount;
      }
    } else if (isSingleMonth) {
      // Group by day of month (e.g. 01 Aug, 02 Aug)
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
      // Group by month
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

    // 4. Budget Calculation for Selected Month
    let budgetAmount = 0;
    if (year && year !== 'all' && month && month !== 'all') {
      const budgetRecord = await prisma.budget.findUnique({
        where: {
          year_month: {
            year: parseInt(year, 10),
            month: parseInt(month, 10),
          },
        },
      });
      if (budgetRecord) {
        budgetAmount = budgetRecord.amount;
      }
    }

    const remainingBudget = Math.max(0, budgetAmount - totalExpenses);
    const overBudget = totalExpenses > budgetAmount && budgetAmount > 0 ? totalExpenses - budgetAmount : 0;
    const percentageSpent = budgetAmount > 0 ? Math.min(100, Math.round((totalExpenses / budgetAmount) * 100)) : 0;

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
        budgetAmount,
        remainingBudget: Math.round(remainingBudget * 100) / 100,
        overBudget: Math.round(overBudget * 100) / 100,
        percentageSpent,
      },
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
  delete: deleteTransaction,
  getSummary: getTransactionSummary,
  getAnalytics: getTransactionAnalytics,
};
