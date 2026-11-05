import { prisma, runAsUser } from '../config/prisma.js';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth.js';
import { ensureInitialData } from '../utils/seedData.js';

/**
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    const cleanUsername = username.trim();

    // Check if user exists in DB
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    await runAsUser(user.id, () => ensureInitialData(user.id));

    const token = generateToken(user.id, user.username);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: error.message,
    });
  }
}

/**
 * POST /api/auth/register
 * Push new user to DB
 */
export async function register(req, res) {
  try {
    if (process.env.ALLOW_REGISTRATION !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'New account registration is disabled. Enable it temporarily in the backend environment to create your account.',
      });
    }

    const { username, password, name } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    const cleanUsername = username.trim();

    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existing = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Username '${cleanUsername}' already exists in database`,
      });
    }

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        password: hashPassword(password),
        name: name?.trim() || cleanUsername,
      },
    });

    await runAsUser(newUser.id, () => ensureInitialData(newUser.id));

    const token = generateToken(newUser.id, newUser.username);

    return res.status(201).json({
      success: true,
      message: 'User registered and saved to database successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error('[Auth Register Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user in database',
      error: error.message,
    });
  }
}

/**
 * GET /api/auth/me
 */
export async function getMe(req, res) {
  try {
    return res.json({ success: true, user: req.user });
  } catch (error) {
    console.error('[Auth Me Error]:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving user' });
  }
}

