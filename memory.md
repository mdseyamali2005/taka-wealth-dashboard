# TakaTrack — Project Memory

> **Last Updated:** 2026-05-12
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
│   ├── auth.ts            # Auth routes (register, login, Google OAuth, login-activity)
│   ├── admin.ts           # Admin routes (register, login, user mgmt, ban/unban, stats)
│   ├── chat.ts            # AI chat routes (Claude + Whisper voice)
│   ├── login-logger.ts    # Login activity logger + IP geolocation + email alerts
│   ├── subscription.ts    # SSLCommerz subscription routes
│   └── middleware.ts      # JWT auth, admin auth & subscription middleware
├── prisma/
│   └── schema.prisma      # Database models (User, Admin, Transaction, Session, etc.)
├── src/
│   ├── App.tsx            # Root component with routing (user + admin)
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
│   │   │   ├── AIChatSidebar.tsx   # AI chat + voice input (Pro feature)
│   │   │   └── LoginActivity.tsx   # Facebook-style login activity log
│   │   └── ui/                     # shadcn/ui components
│   ├── lib/
│   │   ├── utils.ts           # General utilities
│   │   ├── finance-utils.ts   # Finance helpers, types, formatters
│   │   ├── auth-context.tsx   # React user auth context & provider
│   │   └── admin-context.tsx  # React admin auth context & provider
│   ├── pages/
│   │   ├── Index.tsx      # Main app shell
│   │   ├── Login.tsx      # User Login/Register page
│   │   ├── AdminLogin.tsx # Admin Login/Register page
│   │   ├── AdminPanel.tsx # Admin panel (dashboard, users, activity)
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
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` for Gmail |
| `SMTP_PORT` | SMTP port | `587` for TLS |
| `SMTP_USER` | SMTP username/email | Your Gmail address |
| `SMTP_PASS` | SMTP password | Gmail App Password (16-char) |
| `SMTP_FROM` | Sender email | Same as SMTP_USER |
| `ADMIN_JWT_SECRET` | Admin JWT signing secret | Generate random 64-char string |
| `VITE_GOOGLE_CLIENT_ID` | Google client ID (frontend) | Same as GOOGLE_CLIENT_ID |

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
| Login Activity Log | ✅ Done | Facebook-style device/IP/location tracking |
| Login Email Alerts | ✅ Done | Sends email on every new login (nodemailer SMTP) |
| CSV Export | ✅ Done | Download expenses as CSV |
| Local Storage Fallback | ✅ Done | Works offline |
| **Admin Panel** | ✅ Done | Separate login, dashboard stats, user management |
| Admin User Ban/Unban | ✅ Done | Instant ban with reason, session revocation |
| Admin User Delete | ✅ Done | Cascading delete (all related data) |
| Admin Activity Log | ✅ Done | Cross-user login activity feed |
| Admin Subscription Mgmt | ✅ Done | Override user plan (free/pro/canceled) |
| Banned User Blocking | ✅ Done | Blocked at login + middleware level |

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

### 2026-05-09 — Voice Processing & UX Stability 🎤
- **Robust Error Handling:** Replaced generic "Voice processing failed" with specific backend error validation (API keys, audio buffer, Whisper/Claude status).
- **MIME Type Compatibility:** Added fallback logic for `MediaRecorder` to support multiple audio formats across different browsers/OS.
- **Frontend Validation:** Added recording length checks and `res.ok` validation for better UX and error reporting.
- **Git Sync:** Pushed latest stability fixes to main branch.
- **Build:** `vite build` ✅ PASSED (4.08s)

### 2026-05-09 — Login Activity & Security Alerts 🔐
- **Prisma Schema:** Added `LoginLog` model (separate table — IP, device, browser, OS, location, loginMethod)
- **Login Logger:** New `backend/login-logger.ts` — parses User-Agent, fetches IP geolocation (ip-api.com), sends email alerts (nodemailer)
- **Auth Updated:** `auth.ts` now logs every register, login, and Google sign-in event
- **Login Activity API:** `GET /api/auth/login-activity` returns last 50 login events
- **Frontend Page:** New `LoginActivity.tsx` — premium UI with device icons, method badges, active session indicator, security tips
- **Navigation:** Added "Activity" tab with Shield icon
- **Email Alerts:** Beautiful HTML email on every login (device, IP, location, method, time)
- **Dependencies:** Added `nodemailer` + `@types/nodemailer`
- **Env:** Added `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` to `.env.example`
- **Build:** `vite build` ✅ PASSED (3.72s)

### 2026-05-12 — Admin Panel 🛡️
- **Prisma Schema:** Added `Admin` model (separate table) + `isBanned`, `bannedAt`, `banReason`, `bannedBy` fields to `User`
- **Admin Backend:** New `backend/admin.ts` — register, login, /me, dashboard stats, user CRUD, ban/unban, delete, activity feed, subscription override
- **Admin Middleware:** New `requireAdmin()` middleware with separate `ADMIN_JWT_SECRET`
- **Admin Frontend:** New `AdminLogin.tsx` (red/dark theme), `AdminPanel.tsx` (dashboard + users + activity tabs), `admin-context.tsx`
- **Ban System:** Users are blocked at login (`auth.ts`) and at middleware level (`requireAuth`). Sessions revoked on ban.
- **Routes:** `/admin/login` (admin auth), `/admin` (admin panel, protected)
- **Env:** Added `ADMIN_JWT_SECRET` to `.env.example`
- **Build:** `vite build` ✅ PASSED (4.24s)
