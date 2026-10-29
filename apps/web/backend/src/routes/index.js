import { Router } from 'express';
import categoryRoutes from './category.routes.js';
import groupRoutes from './group.routes.js';
import importRoutes from './import.routes.js';
import transactionRoutes from './transaction.routes.js';
import budgetRoutes from './budget.routes.js';
import ruleRoutes from './rule.routes.js';
import authRoutes from './auth.routes.js';
import { ensureDefaultUser } from '../controllers/auth.controller.js';
import { ensureInitialData } from '../utils/seedData.js';

const router = Router();

// Automatically ensure default user 'Sugan' and initial categories/rules exist in database
ensureDefaultUser().catch((err) => console.warn('Could not ensure default user at startup:', err.message));
ensureInitialData().catch((err) => console.warn('Could not ensure initial data at startup:', err.message));

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/groups', groupRoutes);
router.use('/rules', ruleRoutes);
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
