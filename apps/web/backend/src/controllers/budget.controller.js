import { budgetService } from '../services/budget.service.js';

export const getBudget = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required' });
    }
    const budget = await budgetService.getBudget(year, month);
    res.json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setBudget = async (req, res) => {
  try {
    const { year, month, amount } = req.body;
    if (!year || !month || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Year, month, and amount are required' });
    }
    const budget = await budgetService.setBudget(year, month, amount);
    res.json({ success: true, data: budget, message: 'Budget set successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBudgets = async (_req, res) => {
  try {
    const budgets = await budgetService.getAllBudgets();
    res.json({ success: true, data: budgets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const budgetController = {
  getBudget,
  setBudget,
  getAllBudgets,
};
