import { Router } from 'express';
import categoryRoutes from './category.routes.js';
import groupRoutes from './group.routes.js';
import importRoutes from './import.routes.js';
import transactionRoutes from './transaction.routes.js';
import budgetRoutes from './budget.routes.js';

const router = Router();

router.use('/categories', categoryRoutes);
router.use('/groups', groupRoutes);
router.use('/import', importRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budget', budgetRoutes);

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
