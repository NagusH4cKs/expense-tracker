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

export const budgetController = {
  setBudget,
};
