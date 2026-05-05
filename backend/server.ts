import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '../generated/prisma/client.js';

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
app.use(express.json({ limit: '10kb' }));

// Base health route
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Quick DB ping to check connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', db: 'connected', timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: String(error) });
  }
});

// Transactions API
app.get('/api/transactions', async (req: Request, res: Response) => {
  try {
    // Auto-create/find user for demo purposes
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'admin@takatrack.local', password: 'hash' }
      });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', async (req: Request, res: Response) => {
  try {
    const { amount, description, type, date } = req.body;
    
    // Auto-create user if not exists (for demo purposes)
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'admin@takatrack.local', password: 'hash' }
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        description,
        type,
        date: new Date(date),
        userId: user.id
      }
    });
    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.delete('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
