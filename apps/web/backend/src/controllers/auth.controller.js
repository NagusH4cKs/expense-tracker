import { prisma } from '../config/prisma.js';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../utils/auth.js';

/**
 * Ensure default user 'Sugan' with password 'Sugan@123' exists in the database
 */
export async function ensureDefaultUser() {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        username: {
          equals: 'Sugan',
          mode: 'insensitive',
        },
      },
    });

    if (!existing) {
      const newUser = await prisma.user.create({
        data: {
          username: 'Sugan',
          password: hashPassword('Sugan@123'),
          name: 'Sugan',
        },
      });
      console.log('✅ Default user Sugan created in database with id:', newUser.id);
      return newUser;
    } else {
      // Ensure password matches Sugan@123
      if (!verifyPassword('Sugan@123', existing.password)) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            password: hashPassword('Sugan@123'),
          },
        });
        console.log('🔄 Updated password for existing user Sugan to match Sugan@123');
      }
      return existing;
    }
  } catch (error) {
    console.error('Error ensuring default user:', error);
  }
}

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
    let user = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: 'insensitive',
        },
      },
    });

    // If Sugan is logging in and not yet seeded, seed now
    if (!user && cleanUsername.toLowerCase() === 'sugan') {
      user = await ensureDefaultUser();
    }

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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in database' });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('[Auth Me Error]:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving user' });
  }
}

/**
 * GET /api/auth/users
 * List all users in database (useful for verification)
 */
export async function listUsers(_req, res) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('[Auth List Users Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to list users from database' });
  }
}

/**
 * POST /api/auth/seed
 * Explicit endpoint to push default Sugan user to DB
 */
export async function seedUserEndpoint(_req, res) {
  try {
    const user = await ensureDefaultUser();
    return res.json({
      success: true,
      message: 'User Sugan successfully ensured in database',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to seed user in database',
      error: error.message,
    });
  }
}
