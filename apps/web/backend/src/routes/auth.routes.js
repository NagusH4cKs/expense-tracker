import { Router } from 'express';
import {
  login,
  register,
  getMe,
  listUsers,
  seedUserEndpoint,
} from '../controllers/auth.controller.js';

const router = Router();

// Auth routes
router.post('/login', login);
router.post('/register', register);
router.get('/me', getMe);
router.get('/users', listUsers);
router.post('/seed', seedUserEndpoint);

export default router;
