# Separate Frontend & Backend Deployment

Deploy frontend and backend as separate services on Render.

## 🎯 Deployment Strategy

1. **Backend First** - Deploy API service with database
2. **Frontend Second** - Deploy static site that connects to deployed backend

## 📋 Step 1: Deploy Backend

### Option A: Blueprint (Recommended)
1. Go to https://render.com/deploy
2. Paste your GitHub repository URL
3. Select `render-backend.yaml` as blueprint file
4. Click **Apply**

### Option B: Manual Setup
1. Go to https://dashboard.render.com
2. Click **New** → **Web Service**
3. Connect your repository
4. Configure:
   - **Name**: `assignment-backend`
   - **Runtime**: Node
   - **Build Command**: 
     ```
     pnpm install && cd apps/backend && ../../node_modules/.pnpm/node_modules/.bin/prisma generate && pnpm build
     ```
   - **Start Command**:
     ```
     cd apps/backend && ../../node_modules/.pnpm/node_modules/.bin/prisma migrate deploy && node dist/task2/seed-allowlist.js && node dist/index.js
     ```
   - **Environment Variables**:
     ```
     NODE_VERSION=20.20.0
     PORT=10000
     STRIPE_SECRET_KEY=sk_test_your_key
     HUBSPOT_API_KEY=pat-na2_your_key
     GOOGLE_CLIENT_ID=your_google_client_id
     GOOGLE_SECERET_KEY=your_google_secret
     GOOGLE_REFRESH_TOKEN=your_refresh_token
     GOOGLE_CALENDAR_ID=primary
     FRONTEND_URL=*
     ```

### Create Database
1. Click **New** → **PostgreSQL**
2. Name: `assignment-db`
3. Copy **Internal Database URL**
4. Add to backend as `DATABASE_URL` environment variable

## 📋 Step 2: Deploy Frontend

**Important**: Wait for backend deployment to complete and note the backend URL (e.g., `https://assignment-backend.onrender.com`)

### Option A: Blueprint  
1. Go to https://render.com/deploy
2. Select **same repository**
3. Select `render-frontend.yaml` as blueprint file
4. Verify `VITE_API_URL` points to your deployed backend URL
5. Click **Apply**

### Option B: Manual Setup
1. Click **New** → **Static Site**
2. Connect same repository
3. Configure:
   - **Name**: `assignment-frontend`
   - **Build Command**:
     ```
     pnpm install && cd apps/frontend && pnpm build && cp _redirects dist/
     ```
   - **Publish Directory**: `apps/frontend/dist`
   - **Environment Variables**:
     ```
     NODE_VERSION=20.20.0
     VITE_API_URL=https://assignment-backend.onrender.com
     ```

## 🔗 Frontend ↔ Backend Connection

The frontend connects to backend via:

1. **Build-time**: `VITE_API_URL` environment variable
2. **Runtime**: `_redirects` file proxies `/api/*` calls to backend
3. **Development**: `vite.config.ts` proxy configuration

## 🧪 Testing Deployment

### 1. Test Backend Directly
```bash
# Health check
curl https://assignment-backend.onrender.com/api/health

# Task 1 sync
curl -X POST https://assignment-backend.onrender.com/api/sync

# Task 2 metrics
curl "https://assignment-backend.onrender.com/api/task2/metrics/summary?start=2026-01-01&end=2026-01-31"
```

### 2. Test Frontend
1. Open `https://assignment-frontend.onrender.com`
2. Check browser DevTools → Network tab
3. Verify API calls go to `https://assignment-backend.onrender.com/api/*`

## ⚙️ Configuration Files

### Backend Blueprint (`render-backend.yaml`)
- Creates web service + PostgreSQL database
- Runs migrations and seeds on startup
- Configures CORS for any frontend origin

### Frontend Blueprint (`render-frontend.yaml`)  
- Creates static site
- Sets API URL to deployed backend
- Copies `_redirects` for API proxying

### API Proxy (`apps/frontend/_redirects`)
```
/api/*  https://assignment-backend.onrender.com/api/:splat  200
/*      /index.html  200
```

## 🚀 Deployment URLs

After successful deployment:

- **Backend API**: `https://assignment-backend.onrender.com`
  - Health: `https://assignment-backend.onrender.com/api/health`
  - Task 1: `https://assignment-backend.onrender.com/api/sync`  
  - Task 2: `https://assignment-backend.onrender.com/api/task2/metrics/summary`

- **Frontend App**: `https://assignment-frontend.onrender.com`
  - Task 1: `https://assignment-frontend.onrender.com/`
  - Task 2: `https://assignment-frontend.onrender.com/task2`

## 🔧 Updating Backend URL

If you need to change the backend URL:

1. **Update Frontend Environment**:
   - Go to frontend service → Settings → Environment
   - Update `VITE_API_URL` to new backend URL
   - Service will rebuild automatically

2. **Update _redirects file**:
   - Edit `apps/frontend/_redirects`
   - Update backend URL
   - Commit and push changes

## 🎯 Benefits of Separate Deployment

✅ **Independent Scaling** - Scale frontend/backend separately  
✅ **Independent Updates** - Deploy changes without affecting other service  
✅ **Clear Separation** - API service vs static files  
✅ **Better Monitoring** - Separate logs and metrics  
✅ **Flexibility** - Use different regions/plans per service

## 🔍 Troubleshooting

### CORS Errors
- Check `FRONTEND_URL` in backend environment 
- Should be `*` for multiple frontends or specific frontend URL

### API Calls Failing
- Verify `VITE_API_URL` in frontend environment
- Check `_redirects` file is copied to `dist/` folder
- Confirm backend service is running

### Build Failures  
- Check build logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify file paths in build commands

## 🎉 Success Indicators

✅ Backend shows: "🚀 Backend server running on port 10000"  
✅ Frontend shows successful build and deployment  
✅ Health endpoint returns database connection status  
✅ API calls from frontend reach backend successfully  
✅ Both Task 1 and Task 2 work end-to-end