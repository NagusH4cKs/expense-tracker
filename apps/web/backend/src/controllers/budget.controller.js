import { budgetService } from '../services/budget.service.js';

export const getBudget = async (req, res) => {
  try {
    const { year, month, category } = req.query;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required' });
    }
    const budget = await budgetService.getBudget(year, month, category);
    res.json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setBudget = async (req, res) => {
  try {
    const { year, month, amount, category, categoryBudgets } = req.body;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required' });
    }
    if (amount === undefined && (!Array.isArray(categoryBudgets) || categoryBudgets.length === 0)) {
      return res.status(400).json({ success: false, message: 'Amount or categoryBudgets is required' });
    }

    const budget = await budgetService.setBudget({
      year,
      month,
      amount,
      category,
      categoryBudgets,
    });
    res.json({ success: true, data: budget, message: 'Budget saved successfully' });
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
