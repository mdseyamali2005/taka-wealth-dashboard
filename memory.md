# TakaTrack — Project Memory

> **Last Updated:** 2026-05-08
> This file is a living document. It tracks the project's architecture, features, and change history.

---

## 📋 Project Overview

**TakaTrack** is a premium personal finance management dashboard tailored for Bangladeshi Taka (BDT).
It allows users to track expenses, set budgets, view reports, and get AI-powered financial insights.

---

## 🏗️ Tech Stack

| Layer        | Technology                                      |
|-------------|--------------------------------------------------|
| Frontend    | React 18 + Vite 5 + TypeScript                  |
| Styling     | Tailwind CSS 3.4 + shadcn/ui                     |
| Backend     | Express 5 + TypeScript (tsx)                     |
| Database    | Microsoft SQL Server (local) via Prisma 7        |
| State       | React Query + localStorage fallback              |
| Routing     | react-router-dom v6 (SPA)                        |
| Auth        | JWT + bcrypt + Google OAuth                      |
| AI Chat     | Claude API (Anthropic) + OpenAI Whisper STT      |
| Payments    | Stripe (subscription billing)                    |

---

## 📁 File Structure

```
e:\taka-wealth-dashboard\
├── backend/
│   ├── server.ts          # Express server entry point
│   ├── auth.ts            # Auth routes (register, login, Google OAuth)
│   ├── chat.ts            # AI chat routes (Claude + Whisper voice)
│   ├── subscription.ts    # Stripe subscription routes
│   └── middleware.ts       # JWT auth & subscription middleware
├── prisma/
│   └── schema.prisma      # Database models (User, Transaction, Session, ChatMessage)
├── src/z
│   ├── App.tsx            # Root component with routing & auth provider
│   ├── main.tsx           # Vite entry
│   ├── index.css          # Global Tailwind styles & design tokens
│   ├── components/
│   │   ├── finance/
│   │   │   ├── Navigation.tsx      # Sidebar + bottom nav
│   │   │   ├── Dashboard.tsx       # Main dashboard view
│   │   │   ├── AddExpense.tsx      # Manual expense form
│   │   │   ├── ExpenseHistory.tsx  # Expense list with filters
│   │   │   ├── MonthlyReport.tsx   # Charts & monthly summary
│   │   │   ├── BudgetManager.tsx   # Budget setting & tracking
│   │   │   └── AIChatSidebar.tsx   # AI chat + voice input (Pro feature)
│   │   └── ui/                     # shadcn/ui components
│   ├── lib/
│   │   ├── utils.ts           # General utilities
│   │   ├── finance-utils.ts   # Finance helpers, types, formatters
│   │   └── auth-context.tsx   # React auth context & provider
│   ├── pages/
│   │   ├── Index.tsx      # Main app shell
│   │   ├── Login.tsx      # Login/Register page
│   │   ├── Pricing.tsx    # Subscription pricing page
│   │   └── NotFound.tsx   # 404 page
│   └── hooks/
│       ├── use-mobile.tsx
│       └── use-toast.ts
├── .env                   # Environment variables (NOT in git)
├── .env.example           # Template for env vars
├── package.json
├── memory.md              # ← THIS FILE
└── README.md
```

---

## 🔑 Environment Variables

| Variable | Purpose | How to Get |
|----------|---------|------------|
| `DATABASE_URL` | MSSQL connection string | Local SQL Server setup |
| `PORT` | Express server port | Default: `3000` |
| `JWT_SECRET` | JWT signing secret | Generate random 64-char string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console |
| `ANTHROPIC_API_KEY` | Claude API key | console.anthropic.com |
| `OPENAI_API_KEY` | Whisper STT API key | platform.openai.com |
| `STRIPE_SECRET_KEY` | Stripe secret key | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing | Stripe CLI / Dashboard |
| `STRIPE_PRICE_ID` | Monthly plan price ID | Stripe Dashboard |
| `VITE_GOOGLE_CLIENT_ID` | Google client ID (frontend) | Same as GOOGLE_CLIENT_ID |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Stripe Dashboard |

---

## ✨ Features & Status

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | ✅ Done | Summary cards, charts, insights |
| Add Expense | ✅ Done | Manual form with categories |
| Expense History | ✅ Done | List with delete |
| Monthly Report | ✅ Done | Charts & breakdown |
| Budget Manager | ✅ Done | Set & track monthly budget |
| Authentication | ✅ Done | Email/password + Google Sign-In (JWT + bcrypt) |
| AI Chat (Text) | ✅ Done | Hybrid: local parser (FREE) + Claude 3.5 Haiku fallback |
| AI Chat (Voice) | ✅ Done | Bangla voice via OpenAI Whisper STT |
| SSLCommerz Subscription | ✅ Fixed | Replaced with SSLCommerz (bKash, Nagad) for BD |
| CSV Export | ✅ Done | Download expenses as CSV |
| Local Storage Fallback | ✅ Done | Works offline |

---

## 📝 Change Log

### 2026-05-08 — Major Feature Sprint ✅ COMPLETED
- **Created `memory.md`** — This project documentation file
- **Auth System** — JWT + bcrypt + Google OAuth (register, login, Google Sign-In, protected routes)
- **AI Chat** — Hybrid parser (local regex FREE + Claude 3.5 Haiku fallback) + Whisper voice-to-text
- **SaaS Subscription (Local)** — SSLCommerz integration (bKash, Nagad, Cards), success/fail/cancel handling, IPN webhook
- **New files created:** `backend/auth.ts`, `backend/chat.ts`, `backend/subscription.ts`, `backend/middleware.ts`, `src/lib/auth-context.tsx`, `src/pages/Login.tsx`, `src/pages/Pricing.tsx`, `src/components/finance/AIChatSidebar.tsx`
- **Modified files:** `prisma/schema.prisma`, `backend/server.ts`, `src/App.tsx`, `src/pages/Index.tsx`, `src/components/finance/Navigation.tsx`, `.env.example`
- **Build:** `vite build` ✅ PASSED (3.78s)

### 2026-05-08 — Bug Fixes & Payment Update (Post-Audit)
- **Claude model updated:** `claude-3-5-haiku` RETIRED → replaced with `claude-haiku-4-5-20250414`
- **Whisper file upload fixed:** `new File()` doesn't work in Node.js → replaced with `toFile()` from `openai/uploads`
- **Stripe API removed:** Replaced with **SSLCommerz** for Bangladesh support (bKash, Nagad)
- **Prisma Schema updated:** `stripeCustomerId` → `paymentCustomerId`
- **Build:** `vite build` ✅ PASSED (3.88s)
