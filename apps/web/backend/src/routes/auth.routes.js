import { Router } from 'express';
import {
  login,
  register,
  getMe,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Auth routes
router.post('/login', login);
router.post('/register', register);
router.get('/me', requireAuth, getMe);

export default router;
