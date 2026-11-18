import { Router } from 'express';
import {
  getTransactions,
  filterTransactions,
  createTransaction,
  updateTransaction,
  getSummary,
  getAnalytics,
  deleteTransaction,
  getRefundCandidates,
  linkRefund,
  saveSplit,
  getSplitReceivables,
  settleSplitShare,
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
router.get('/split-receivables', getSplitReceivables);
router.post('/split-shares/:shareId/settlements', settleSplitShare);
router.get('/:id/refund-candidates', getRefundCandidates);
router.patch('/:id/refund', linkRefund);
router.put('/:id/split', saveSplit);
router.delete('/:id', deleteTransaction);

export default router;
