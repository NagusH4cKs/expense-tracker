import { budgetService } from '../services/budget.service.js';

export const setBudget = async (req, res) => {
  try {
    const { year, month, amount, category } = req.body;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required' });
    }
    if (amount === undefined) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    const budget = await budgetService.setBudget({
      year,
      month,
      amount,
      category,
    });
    res.json({ success: true, data: budget, message: 'Budget saved successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const setBatchBudgets = async (req, res) => {
  try {
    const { year, month, budgets } = req.body;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required' });
    }
    if (!Array.isArray(budgets)) {
      return res.status(400).json({ success: false, message: 'Budgets array is required' });
    }

    const saved = await budgetService.setBatchBudgets({ year, month, budgets });
    res.json({ success: true, data: saved, message: 'Budgets saved successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getBudgetsForMonth = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required' });
    }

    const data = await budgetService.getBudgetsForMonth(year, month);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const budgetController = {
  setBudget,
  setBatchBudgets,
  getBudgetsForMonth,
};
