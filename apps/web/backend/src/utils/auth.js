import crypto from 'crypto';

/**
 * Hash password with salt using scrypt
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash (or plain text fallback)
 */
export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, key] = stored.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  const actual = Buffer.from(hash, 'hex');
  const expected = Buffer.from(key, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return secret;
};

/**
 * Generate a secure session token
 */
export function generateToken(userId, username) {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      username,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })
  ).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(payload)
    .digest('base64url');
    
  return `${payload}.${signature}`;
}

/**
 * Verify session token
 */
export function verifyToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getJwtSecret())
      .update(payload)
      .digest('base64url');

    const actualSignature = Buffer.from(signature);
    const expectedSignature = Buffer.from(expectedSig);
    if (actualSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(actualSignature, expectedSignature)) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch (err) {
    return null;
  }
}
