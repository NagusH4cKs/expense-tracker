import { Router } from 'express';
import { getBudget, setBudget, getAllBudgets } from '../controllers/budget.controller.js';

const router = Router();

router.get('/', getBudget);
router.post('/', setBudget);
router.get('/all', getAllBudgets);

export default router;
