import { Router } from 'express';
import categoryRoutes from './category.routes.js';
import groupRoutes from './group.routes.js';
import importRoutes from './import.routes.js';
import transactionRoutes from './transaction.routes.js';
import budgetRoutes from './budget.routes.js';
import authRoutes from './auth.routes.js';
import { ensureDefaultUser } from '../controllers/auth.controller.js';

const router = Router();

// Automatically ensure default user 'Sugan' exists in database
ensureDefaultUser().catch((err) => console.warn('Could not ensure default user at startup:', err.message));

router.use('/auth', authRoutes);
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
