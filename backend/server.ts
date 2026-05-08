import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '../generated/prisma/client.js';
import { AuthRequest, requireAuth } from './middleware.js';
import authRoutes from './auth.js';
import chatRoutes from './chat.js';
import subscriptionRoutes from './subscription.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure SQL Server adapter for Prisma 7
const adapter = new PrismaMssql({
  server: 'localhost',
  port: 1433,
  database: 'TakaWealth',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'TakaTrack@2026',
    },
  },
});

const prisma = new PrismaClient({ adapter });

// Middleware
app.use(cors());

// JSON parsing for all routes
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true })); // SSLCommerz callbacks often use urlencoded

// Base health route
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', db: 'connected', timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: String(error) });
  }
});

// ─── Auth Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes(prisma));

// ─── Chat Routes ────────────────────────────────────────────────
app.use('/api/chat', chatRoutes(prisma));

// ─── Subscription Routes ────────────────────────────────────────
app.use('/api/subscription', subscriptionRoutes(prisma));

// ─── Transaction Routes (now auth-protected) ────────────────────
app.get('/api/transactions', requireAuth(prisma), async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', requireAuth(prisma), async (req: AuthRequest, res: Response) => {
  try {
    const { amount, description, type, date } = req.body;

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        description,
        type,
        date: new Date(date),
        userId: req.userId!
      }
    });
    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.delete('/api/transactions/:id', requireAuth(prisma), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Ensure user can only delete their own transactions
    const tx = await prisma.transaction.findUnique({ where: { id: Number(id) } });
    if (!tx || tx.userId !== req.userId) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    await prisma.transaction.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Centralized error handler to avoid exposing stack traces
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal Server Error'
    }
  });
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
