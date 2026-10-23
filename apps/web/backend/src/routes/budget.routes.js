import { Router } from 'express';
import { setBudget } from '../controllers/budget.controller.js';

const router = Router();

router.post('/', setBudget);

export default router;
