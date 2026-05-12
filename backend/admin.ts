import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AdminRequest, requireAdmin, generateAdminToken } from './middleware.js';

const router = Router();

export default function adminRoutes(prisma: any) {

  // ─── Admin Register ─────────────────────────────────────────────
  router.post('/register', async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({ error: 'Email, password, and name are required' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }

      // Check if admin exists
      const existing = await prisma.admin.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ error: 'An admin account with this email already exists' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const admin = await prisma.admin.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'admin',
        },
      });

      const token = generateAdminToken(admin.id, admin.email, admin.role);

      res.status(201).json({
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          avatarUrl: admin.avatarUrl,
        },
      });
    } catch (error) {
      console.error('Admin register error:', error);
      res.status(500).json({ error: 'Admin registration failed' });
    }
  });

  // ─── Admin Login ────────────────────────────────────────────────
  router.post('/login', async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const admin = await prisma.admin.findUnique({ where: { email } });
      if (!admin) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = generateAdminToken(admin.id, admin.email, admin.role);

      res.json({
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          avatarUrl: admin.avatarUrl,
        },
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: 'Admin login failed' });
    }
  });

  // ─── Get Current Admin ──────────────────────────────────────────
  router.get('/me', requireAdmin(prisma), async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: req.adminId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      if (!admin) {
        res.status(404).json({ error: 'Admin not found' });
        return;
      }

      res.json({ admin });
    } catch (error) {
      console.error('Get admin error:', error);
      res.status(500).json({ error: 'Failed to get admin info' });
    }
  });

  // ─── Dashboard Stats ───────────────────────────────────────────
  router.get('/stats', requireAdmin(prisma), async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const [totalUsers, bannedUsers, totalTransactions, totalAdmins] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isBanned: true } }),
        prisma.transaction.count(),
        prisma.admin.count(),
      ]);

      // Active users (logged in within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeUsers = await prisma.session.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { userId: true },
        distinct: ['userId'],
      });

      // Pro subscribers
      const proUsers = await prisma.user.count({
        where: { subscriptionStatus: 'active' },
      });

      // Recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSignups = await prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      });

      // Total revenue (sum of all expense transactions)
      const transactions = await prisma.transaction.findMany({
        select: { amount: true },
      });
      const totalVolume = transactions.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

      res.json({
        totalUsers,
        bannedUsers,
        activeUsers: activeUsers.length,
        proUsers,
        recentSignups,
        totalTransactions,
        totalVolume,
        totalAdmins,
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  // ─── List All Users ─────────────────────────────────────────────
  router.get('/users', requireAdmin(prisma), async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const { search, status, page = '1', limit = '20' } = req.query as Record<string, string>;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search } },
          { name: { contains: search } },
        ];
      }

      if (status === 'banned') {
        where.isBanned = true;
      } else if (status === 'active') {
        where.isBanned = false;
      } else if (status === 'pro') {
        where.subscriptionStatus = 'active';
      } else if (status === 'free') {
        where.subscriptionStatus = 'free';
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            subscriptionStatus: true,
            isBanned: true,
            bannedAt: true,
            banReason: true,
            createdAt: true,
            _count: {
              select: {
                transactions: true,
                loginLogs: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // ─── Get Single User Details ────────────────────────────────────
  router.get('/users/:id', requireAdmin(prisma), async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          subscriptionStatus: true,
          paymentCustomerId: true,
          isBanned: true,
          bannedAt: true,
          banReason: true,
          bannedBy: true,
          budget: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              transactions: true,
              loginLogs: true,
              sessions: true,
              chatMessages: true,
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Get recent login activity
      const recentLogins = await prisma.loginLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          ip: true,
          location: true,
          device: true,
          browser: true,
          os: true,
          loginMethod: true,
          createdAt: true,
        },
      });

      res.json({ user, recentLogins });
    } catch (error) {
      console.error('Get user detail error:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  });

  // ─── Ban User ───────────────────────────────────────────────────
  router.post('/users/:id/ban', requireAdmin(prisma), async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);
      const { reason } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.isBanned) {
        res.status(400).json({ error: 'User is already banned' });
        return;
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          bannedAt: new Date(),
          banReason: reason || 'Violated terms of service',
          bannedBy: req.adminId,
        },
      });

      // Revoke all active sessions for banned user
      await prisma.session.deleteMany({ where: { userId } });

      res.json({ success: true, message: `User ${user.email} has been banned` });
    } catch (error) {
      console.error('Ban user error:', error);
      res.status(500).json({ error: 'Failed to ban user' });
    }
  });

  // ─── Unban User ─────────────────────────────────────────────────
  router.post('/users/:id/unban', requireAdmin(prisma), async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (!user.isBanned) {
        res.status(400).json({ error: 'User is not banned' });
        return;
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          bannedAt: null,
          banReason: null,
          bannedBy: null,
        },
      });

      res.json({ success: true, message: `User ${user.email} has been unbanned` });
    } catch (error) {
      console.error('Unban user error:', error);
      res.status(500).json({ error: 'Failed to unban user' });
    }
  });

  // ─── Delete User ────────────────────────────────────────────────
  router.delete('/users/:id', requireAdmin(prisma), async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Delete related data first (cascading)
      await prisma.chatMessage.deleteMany({ where: { userId } });
      await prisma.loginLog.deleteMany({ where: { userId } });
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });

      res.json({ success: true, message: `User ${user.email} has been deleted` });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // ─── Recent Activity (across all users) ─────────────────────────
  router.get('/activity', requireAdmin(prisma), async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const recentLogins = await prisma.loginLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          email: true,
          ip: true,
          location: true,
          device: true,
          browser: true,
          os: true,
          loginMethod: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              avatarUrl: true,
              isBanned: true,
            },
          },
        },
      });

      res.json(recentLogins);
    } catch (error) {
      console.error('Activity error:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

  // ─── Update User Subscription (admin override) ─────────────────
  router.patch('/users/:id/subscription', requireAdmin(prisma), async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);
      const { status } = req.body;

      const validStatuses = ['free', 'active', 'canceled', 'past_due'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
        return;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { subscriptionStatus: status },
      });

      res.json({ success: true, message: `User subscription updated to ${status}`, user: { id: user.id, email: user.email, subscriptionStatus: user.subscriptionStatus } });
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  });

  return router;
}
