# QuickAI - Vercel Deployment & Setup Guide

This guide provides step-by-step instructions for deploying QuickAI to Vercel, configuring environment variables, setting up the Neon PostgreSQL database, and running the project locally or in production.

---

## 1. Architecture Overview

- **Frontend**: React 19 + Vite + TailwindCSS v4 + Clerk React (`client/`)
- **Backend**: Node.js + Express 5 (`server/`)
- **Serverless API**: Handled seamlessly by `/api/index.js` on Vercel
- **Database**: Neon Serverless PostgreSQL (`creations` table)
- **AI Integrations**:
  - Google Gemini API (`gemini-2.0-flash` for article writing, blog titles, resume analysis)
  - ClipDrop API (Text-to-Image generation)
  - Cloudinary (Image upload, AI background removal, AI object removal)
  - Clerk (User authentication, subscription plans & free usage tracking)

---

## 2. Environment Variables Configuration

Set these environment variables in your **Vercel Project Settings -> Environment Variables**:

| Variable Name | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key | `pk_test_...` |
| `CLERK_SECRET_KEY` | Yes | Clerk backend secret key | `sk_test_...` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key for frontend | `pk_test_...` |
| `VITE_BASE_URL` | No | Base URL for API requests. Leave blank or empty string for same-origin Vercel deployment. | `""` |
| `GEMINI_API_KEY` | Yes | Google Generative AI API Key | `AIzaSy...` |
| `CLIPDROP_API_KEY` | For Image Gen | ClipDrop API Key | `...` |
| `CLOUDINARY_CLOUD_NAME` | For Images | Cloudinary Cloud Name | `...` |
| `CLOUDINARY_API_KEY` | For Images | Cloudinary API Key | `...` |
| `CLOUDINARY_API_SECRET` | For Images | Cloudinary API Secret | `...` |

---

## 3. Database Initialization (Neon PostgreSQL)

1. Create a free PostgreSQL database on [Neon](https://neon.tech).
2. Copy your connection string into `DATABASE_URL`.
3. Run the schema creation script:
   ```bash
   npm run init-db
   ```
   Or execute `server/database/schema.sql` directly inside the Neon SQL console:
   ```sql
   CREATE TABLE IF NOT EXISTS creations (
       id SERIAL PRIMARY KEY,
       user_id TEXT NOT NULL,
       prompt TEXT NOT NULL,
       content TEXT NOT NULL,
       type VARCHAR(50) NOT NULL,
       publish BOOLEAN DEFAULT FALSE,
       likes TEXT[] DEFAULT '{}',
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   CREATE INDEX IF NOT EXISTS idx_creations_user_id ON creations (user_id);
   CREATE INDEX IF NOT EXISTS idx_creations_publish ON creations (publish, created_at DESC);
   ```

---

## 4. Deploying to Vercel

### Method A: Deploy via GitHub (Recommended)
1. Push your repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import the repository.
4. Keep the Framework Preset as **Other** (configured by `vercel.json`).
5. In **Environment Variables**, add the variables listed above.
6. Click **Deploy**.

### Method B: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel
vercel --prod
```

---

## 5. Local Development

1. Install all dependencies:
   ```bash
   npm run install:all
   ```
2. Start the backend:
   ```bash
   npm run dev:server
   ```
3. Start the frontend:
   ```bash
   npm run dev:client
   ```
4. Or build the production client:
   ```bash
   npm run build
   ```
