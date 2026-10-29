import { Router } from 'express';
import { budgetController } from '../controllers/budget.controller.js';

const router = Router();

router.get('/', budgetController.getBudgetsForMonth);
router.post('/', budgetController.setBudget);
router.post('/batch', budgetController.setBatchBudgets);

export default router;
