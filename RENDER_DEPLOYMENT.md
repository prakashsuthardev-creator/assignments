# Deploying to Render

This guide walks you through deploying the application to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Stripe test API key
4. HubSpot API key
5. Google Calendar API credentials

## Deployment Options

### Option 1: Blueprint (Recommended - One-Click Deploy)

1. Push your code to GitHub
2. Go to https://render.com/deploy
3. Connect your repository
4. Render will detect `render.yaml` and create all services automatically

### Option 2: Manual Setup

Follow these steps if you prefer manual configuration or need customization.

## Manual Deployment Steps

### Step 1: Create PostgreSQL Database

1. Log in to Render Dashboard
2. Click **New +** → **PostgreSQL**
3. Configure:
   - **Name**: `assignment-db`
   - **Database**: `assignment`
   - **Region**: Singapore (or closest to you)
   - **Plan**: Free
4. Click **Create Database**
5. Wait for database to provision
6. Copy the **Internal Database URL** (starts with `postgresql://`)

### Step 2: Deploy Backend API

1. Click **New +** → **Web Service**
2. Connect your Git repository
3. Configure:
   - **Name**: `assignment-backend`
   - **Region**: Singapore
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave blank
   - **Runtime**: Node
   - **Build Command**:
     ```bash
     cd apps/backend && pnpm install && ../../node_modules/.pnpm/node_modules/.bin/prisma generate && pnpm build
     ```
   - **Start Command**:
     ```bash
     cd apps/backend && ../../node_modules/.pnpm/node_modules/.bin/prisma migrate deploy && node dist/index.js
     ```
   - **Plan**: Free

4. Add Environment Variables:
   Click **Advanced** → **Add Environment Variable**:
   
   | Key | Value | Notes |
   |-----|-------|-------|
   | `NODE_VERSION` | `20.20.0` | |
   | `DATABASE_URL` | (Paste Internal Database URL from Step 1) | |
   | `PORT` | `3000` | |
   | `STRIPE_SECRET_KEY` | `sk_test_...` | Your Stripe test key |
   | `HUBSPOT_API_KEY` | `pat-na2-...` | Your HubSpot key |
   | `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com` | |
   | `GOOGLE_SECERET_KEY` | `GOCSPX-...` | |
   | `GOOGLE_REFRESH_TOKEN` | `1//04...` | |
   | `GOOGLE_CALENDAR_ID` | `primary` | |

5. Click **Create Web Service**

6. Wait for deployment to complete (5-10 minutes)

7. Note your backend URL (e.g., `https://assignment-backend.onrender.com`)

### Step 3: Deploy Frontend

1. Click **New +** → **Static Site**
2. Connect the same repository
3. Configure:
   - **Name**: `assignment-frontend`
   - **Region**: Singapore
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Build Command**:
     ```bash
     cd apps/frontend && pnpm install && pnpm build
     ```
   - **Publish Directory**: `apps/frontend/dist`

4. Add Environment Variables:
   
   | Key | Value |
   |-----|-------|
   | `NODE_VERSION` | `20.20.0` |
   | `VITE_API_URL` | (Your backend URL from Step 2) |

5. Click **Create Static Site**

6. Wait for deployment (3-5 minutes)

### Step 4: Configure Frontend API Proxy

Since the frontend needs to call the backend API, you need to configure the API base URL:

1. Go to your frontend's **Settings** → **Redirects/Rewrites**
2. Add this rule:
   - **Source**: `/api/*`
   - **Destination**: `https://assignment-backend.onrender.com/api/:splat`
   - **Status**: 200 (Rewrite)

### Step 5: Seed Task 2 Allowlist

After the backend is deployed and running:

1. Go to your backend service in Render
2. Click **Shell** (in the top right)
3. Run:
   ```bash
   cd apps/backend
   node dist/task2/seed-allowlist.js
   ```

This populates the Task 2 status allowlist in the database.

### Step 6: Verify Deployment

1. Open your frontend URL (e.g., `https://assignment-frontend.onrender.com`)
2. Check the Sync page:
   - Should show "PostgreSQL Connected" (not in-memory fallback)
3. Click "Run Sync" to test Task 1
4. Navigate to `/task2`
5. Click "Sync Stripe Test Data" to test Task 2

## Post-Deployment

### Update Environment Variables

If you need to update any environment variables:

1. Go to service **Settings** → **Environment**
2. Update the variable
3. Service will automatically redeploy

### View Logs

- Backend: Go to service → **Logs** tab
- Check for errors or startup issues

### Database Management

- Access via Render Dashboard → Database → **Connect**
- Use provided connection string with tools like `psql`, TablePlus, or DBeaver

## Troubleshooting

### Backend shows "In-Memory Fallback"

**Cause**: Database connection failed

**Solution**:
1. Check `DATABASE_URL` is set correctly
2. Ensure it's the **Internal Database URL** (not External)
3. Check database is running and accessible
4. View backend logs for specific error

### Frontend can't reach API

**Cause**: CORS or proxy misconfiguration

**Solution**:
1. Verify `VITE_API_URL` points to backend URL
2. Check redirect/rewrite rules in frontend settings
3. Ensure backend CORS allows frontend origin
4. Check `apps/backend/src/index.ts` has correct CORS config

### Prisma migration fails

**Cause**: Database schema mismatch

**Solution**:
1. Access database shell (Render Dashboard → Database → **Connect**)
2. Run:
   ```sql
   DROP TABLE IF EXISTS task2_transactions CASCADE;
   DROP TABLE IF EXISTS task2_status_allowlist CASCADE;
   ```
3. Redeploy backend to run migrations fresh

### "Module not found" errors

**Cause**: Build command incomplete

**Solution**:
1. Ensure build command includes `pnpm install`
2. Check `pnpm-workspace.yaml` is in repo root
3. Verify all `package.json` files are committed

### Free plan cold starts

**Note**: Render free tier services sleep after 15 minutes of inactivity. First request after sleep takes ~30-60 seconds to wake up.

**Solution**: Upgrade to paid plan for always-on services, or accept occasional cold starts.

## Architecture on Render

```
┌─────────────────────────────────────────────────────────────┐
│  User Browser                                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Frontend Static Site                                       │
│  (assignment-frontend.onrender.com)                         │
│  - Serves React app                                         │
│  - Proxies /api/* to backend                                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Backend Web Service                                        │
│  (assignment-backend.onrender.com)                          │
│  - Node.js + Express API                                    │
│  - Handles Task 1 & Task 2 logic                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL Database                                        │
│  (assignment-db)                                            │
│  - Stores all data (Task 1 & Task 2)                        │
│  - Prisma ORM                                               │
└─────────────────────────────────────────────────────────────┘
```

## Costs

All services can run on Render's **free tier**:

- PostgreSQL: Free (1GB storage, expires after 90 days of inactivity)
- Backend Web Service: Free (750 hours/month)
- Frontend Static Site: Free (100GB bandwidth/month)

**Note**: Free services sleep after 15 minutes of inactivity.

## Next Steps

After successful deployment:

1. Set up custom domain (optional)
2. Configure HTTPS (automatic on Render)
3. Set up monitoring/alerts
4. Consider upgrading to paid plans for production use

## Support

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- Check backend logs for specific errors
