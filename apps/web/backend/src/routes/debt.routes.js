import { Router } from 'express';
import { debtController } from '../controllers/debt.controller.js';

const router = Router();
router.get('/', debtController.list);
router.post('/', debtController.create);
router.post('/:id/repayments', debtController.addRepayment);
export default router;
