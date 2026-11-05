import { Router } from 'express';
import categoryRoutes from './category.routes.js';
import groupRoutes from './group.routes.js';
import importRoutes from './import.routes.js';
import transactionRoutes from './transaction.routes.js';
import budgetRoutes from './budget.routes.js';
import ruleRoutes from './rule.routes.js';
import authRoutes from './auth.routes.js';
import debtRoutes from './debt.routes.js';
import calendarRoutes from './calendar.routes.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.use('/auth', authRoutes);
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

router.use(requireAuth);
router.use('/categories', categoryRoutes);
router.use('/groups', groupRoutes);
router.use('/rules', ruleRoutes);
router.use('/import', importRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budget', budgetRoutes);
router.use('/debts', debtRoutes);
router.use('/calendar-events', calendarRoutes);

export default router;
