import { prisma, runAsUser } from '../config/prisma.js';
import { verifyToken } from '../utils/auth.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication is required' });
    }

    const payload = verifyToken(authorization.slice(7));
    if (!payload?.userId) {
      return res.status(401).json({ success: false, message: 'Session is invalid or expired' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Account no longer exists' });
    }

    req.user = { id: user.id, username: user.username, name: user.name };
    return runAsUser(user.id, () => next());
  } catch (error) {
    return next(error);
  }
};
