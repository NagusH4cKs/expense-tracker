import { Router } from 'express';
import {
  getTransactions,
  filterTransactions,
  createTransaction,
  updateTransaction,
  getSummary,
  getAnalytics,
  deleteTransaction,
} from '../controllers/transaction.controller.js';

const router = Router();

router.get('/', getTransactions);
router.get('/filter', filterTransactions);
router.post('/filter', filterTransactions);
router.post('/', createTransaction);
router.patch('/:id', updateTransaction);
router.put('/:id', updateTransaction);
router.get('/summary', getSummary);
router.get('/analytics', getAnalytics);
router.delete('/:id', deleteTransaction);

export default router;
