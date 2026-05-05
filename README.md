# TakaTrack — Premium Finance Manager

TakaTrack is a professional personal finance management dashboard tailored for Bangladeshi Taka (BDT). 
Built with modern web technologies to ensure a fast, reliable, and premium user experience.

## Tech Stack
- Frontend: React + Vite + TypeScript
- Styling: Tailwind CSS + shadcn-ui
- Backend: Express + Prisma (Microsoft SQL Server)

## Prerequisites
- Node.js & npm installed
- Microsoft SQL Server running locally

## Setup

1. **Install Dependencies**
   ```sh
   npm install
   ```

2. **Database Setup**
   Configure your local Microsoft SQL Server credentials in the `.env` file.
   ```sh
   cp .env.example .env
   # Update the DATABASE_URL inside .env
   ```
   Then run the migrations:
   ```sh
   npx prisma migrate dev
   ```

3. **Start Development Server**
   ```sh
   # To start both frontend and backend concurrently:
   npm run dev
   ```

## Design Philosophy
TakaTrack employs a professional design system focused on clarity and ease of use, featuring dark slate tones, warm whites, and accessible typography. All interface elements are meticulously crafted to ensure a "premium" feel.
