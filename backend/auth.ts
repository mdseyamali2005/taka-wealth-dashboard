import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { AuthRequest, requireAuth, generateToken } from './middleware.js';
import { recordLoginActivity } from './login-logger.js';

const router = Router();

export default function authRoutes(prisma: any) {
  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  // ─── Register ───────────────────────────────────────────────────
  router.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
      }

      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ error: 'An account with this email already exists' });
        return;
      }

      // Hash password & create user
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || email.split('@')[0],
        },
      });

      const token = generateToken(user.id, user.email);

      // Log registration activity & get device info
      const deviceInfo = await recordLoginActivity(prisma, user.id, user.email, 'register', req);

      // Save session to database (wrapped in try-catch so it doesn't block login if it fails)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Match 30d JWT expiry
      try {
        await prisma.session.create({
          data: {
            userId: user.id,
            token,
            expiresAt,
            ...deviceInfo
          },
        });
      } catch (sessionErr) {
        console.error('Session creation failed, but proceeding with login:', sessionErr);
      }

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          subscriptionStatus: user.subscriptionStatus,
        },
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // ─── Login ──────────────────────────────────────────────────────
  router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = generateToken(user.id, user.email);

      // Log login activity & get device info
      const deviceInfo = await recordLoginActivity(prisma, user.id, user.email, 'email', req);

      // Save session to database (wrapped in try-catch so it doesn't block login if it fails)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Match 30d JWT expiry
      try {
        await prisma.session.create({
          data: {
            userId: user.id,
            token,
            expiresAt,
            ...deviceInfo
          },
        });
      } catch (sessionErr) {
        console.error('Session creation failed, but proceeding with login:', sessionErr);
      }

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          subscriptionStatus: user.subscriptionStatus,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // ─── Google OAuth ───────────────────────────────────────────────
  router.post('/google', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { credential } = req.body;

      if (!credential) {
        res.status(400).json({ error: 'Google credential is required' });
        return;
      }

      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        res.status(400).json({ error: 'Invalid Google token' });
        return;
      }

      const { email, name, picture, sub: googleId } = payload;

      // Find or create user
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { email },
          ],
        },
      });

      if (user) {
        // Update Google info if needed
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId, avatarUrl: picture || user.avatarUrl },
          });
        }
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: email!,
            name: name || email!.split('@')[0],
            password: '', // No password for Google-only users
            googleId,
            avatarUrl: picture || null,
          },
        });
      }

      const token = generateToken(user.id, user.email);

      // Log Google login activity & get device info
      const deviceInfo = await recordLoginActivity(prisma, user.id, user.email, 'google', req);

      // Save session to database (wrapped in try-catch so it doesn't block login if it fails)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Match 30d JWT expiry
      try {
        await prisma.session.create({
          data: {
            userId: user.id,
            token,
            expiresAt,
            ...deviceInfo
          },
        });
      } catch (sessionErr) {
        console.error('Session creation failed, but proceeding with login:', sessionErr);
      }

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          subscriptionStatus: user.subscriptionStatus,
        },
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ error: 'Google authentication failed' });
    }
  });

  // ─── Get Current User ──────────────────────────────────────────
  router.get('/me', requireAuth(prisma), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          subscriptionStatus: true,
          paymentCustomerId: true,
          createdAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  });

  // ─── Login Activity History ────────────────────────────────────
  router.get('/login-activity', requireAuth(prisma), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const logs = await prisma.loginLog.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 50, // Last 50 logins
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
        },
      });

      res.json(logs);
    } catch (error) {
      console.error('Login activity error:', error);
      res.status(500).json({ error: 'Failed to fetch login activity' });
    }
  });

  // ─── Active Sessions (Where you're logged in) ────────────────
  router.get('/sessions', requireAuth(prisma), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const sessions = await prisma.session.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ip: true,
          location: true,
          device: true,
          browser: true,
          os: true,
          createdAt: true,
          // exclude token for security
        }
      });
      res.json(sessions);
    } catch (error) {
      console.error('Session fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  router.delete('/sessions/:id', requireAuth(prisma), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.session.delete({
        where: { id: req.params.id, userId: req.userId },
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Session delete error:', error);
      res.status(500).json({ error: 'Failed to revoke session' });
    }
  });

  // ─── Logout (client-side token removal, but we can track) ─────
  router.post('/logout', requireAuth(prisma), async (req: AuthRequest, res: Response): Promise<void> => {
    // JWT is stateless, so client just deletes the token
    // But we can invalidate sessions if needed in the future
    res.json({ success: true, message: 'Logged out successfully' });
  });

  return router;
}
