import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-dev-secret-change-in-production';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
}

export interface AdminRequest extends Request {
  adminId?: number;
  adminEmail?: string;
  adminRole?: string;
}

/**
 * Middleware: Verify JWT token and check if it exists in the active sessions.
 * Also checks if user is banned.
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

      // Check if user is banned
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { isBanned: true, banReason: true },
      });

      if (user?.isBanned) {
        res.status(403).json({
          error: 'Account suspended',
          message: user.banReason || 'Your account has been suspended. Contact support for help.',
        });
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
 * Middleware: Verify admin JWT token.
 * Attaches adminId, adminEmail, adminRole to the request object.
 */
export function requireAdmin(prisma: any) {
  return async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { adminId: number; email: string; role: string };

      // Verify admin still exists in DB
      const admin = await prisma.admin.findUnique({ where: { id: decoded.adminId } });
      if (!admin) {
        res.status(401).json({ error: 'Admin account not found' });
        return;
      }

      req.adminId = decoded.adminId;
      req.adminEmail = decoded.email;
      req.adminRole = decoded.role;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired admin token' });
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

/**
 * Generate a JWT token for an admin.
 */
export function generateAdminToken(adminId: number, email: string, role: string): string {
  return jwt.sign({ adminId, email, role }, ADMIN_JWT_SECRET, { expiresIn: '7d' });
}

