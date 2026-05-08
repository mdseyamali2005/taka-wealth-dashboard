import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
}

/**
 * Middleware: Verify JWT token and check if it exists in the active sessions.
 * Attaches userId and userEmail to the request object.
 */
export function requireAuth(prisma: any) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      
      // Check if session is active in the database
      const session = await prisma.session.findUnique({ where: { token } });
      if (!session) {
        res.status(401).json({ error: 'Session expired or revoked from another device' });
        return;
      }

      req.userId = decoded.userId;
      req.userEmail = decoded.email;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

/**
 * Middleware: Check if user has an active subscription.
 * Must be used AFTER requireAuth.
 */
export function requireSubscription(prisma: any) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { subscriptionStatus: true },
      });

      if (!user || user.subscriptionStatus !== 'active') {
        res.status(403).json({
          error: 'Subscription required',
          message: 'Upgrade to Pro to access AI Chat features',
          subscriptionStatus: user?.subscriptionStatus || 'free',
        });
        return;
      }

      next();
    } catch {
      res.status(500).json({ error: 'Failed to check subscription status' });
    }
  };
}

/**
 * Generate a JWT token for a user.
 */
export function generateToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' });
}
