import { transactionService } from '../services/transaction.service.js';

export const getTransactions = async (req, res) => {
  try {
    const {
      category,
      search,
      type,
      account,
      page,
      limit,
      startDate,
      endDate,
      date,
      month,
      year,
    } = req.query;

    const result = await transactionService.getAll({
      category,
      search,
      type,
      account,
      page,
      limit,
      startDate,
      endDate,
      date,
      month,
      year,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const filterTransactions = async (req, res) => {
  try {
    // Supports query params or JSON body (for flexible client requests)
    const params = { ...req.query, ...(req.body || {}) };

    const result = await transactionService.getAll({
      category: params.category,
      search: params.search,
      type: params.type,
      account: params.account,
      page: params.page,
      limit: params.limit,
      startDate: params.startDate,
      endDate: params.endDate,
      date: params.date,
      month: params.month,
      year: params.year,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTransaction = async (req, res) => {
  try {
    const transaction = await transactionService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await transactionService.delete(id);
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSummary = async (_req, res) => {
  try {
    const summary = await transactionService.getSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const { year, month, date } = req.query;
    const analytics = await transactionService.getAnalytics({ year, month, date });
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const transactionController = {
  getTransactions,
  filterTransactions,
  createTransaction,
  deleteTransaction,
  getSummary,
  getAnalytics,
};
