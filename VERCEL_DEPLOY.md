# Deploy Frontend on Vercel

## 🚀 Step-by-Step Deployment Guide

### Step 1: Prepare Your Repository

1. **Ensure code is pushed to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

### Step 2: Create Vercel Account & Deploy

1. **Go to Vercel:**
   - Visit: https://vercel.com
   - Click **Sign Up** (use GitHub for easy integration)

2. **Import Project:**
   - Click **New Project**
   - Select **Import Git Repository**
   - Choose your GitHub repository: `prakashsuthardev-creator/assignments`
   - Click **Import**

### Step 3: Configure Build Settings

**Framework Preset:**
- Select: **Other** (not React, since we have custom setup)

**Root Directory:**
- Set to: `apps/frontend`
- ✅ Check "Include source files outside of the Root Directory"

**Build Settings:**
- **Build Command**: 
  ```bash
  pnpm install && pnpm run build
  ```
- **Output Directory**: 
  ```bash
  dist
  ```
- **Install Command**: 
  ```bash
  pnpm install
  ```

### Step 4: Environment Variables

Add these environment variables in the Vercel dashboard:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://assignment-backend-j6gb.onrender.com` |
| `NODE_VERSION` | `20` |

### Step 5: Deploy

1. **Click Deploy** - Vercel will:
   - Clone your repository
   - Install dependencies
   - Build the React app
   - Deploy to global CDN

2. **Wait for deployment** (usually 2-3 minutes)

3. **Get your URL** (e.g., `https://assignments-frontend.vercel.app`)

## 🔧 Alternative: Manual Configuration

If automatic detection doesn't work:

### Option A: Use vercel.json (Recommended)

I've created a `vercel.json` file in your repo root with:

```json
{
  "buildCommand": "cd apps/frontend && pnpm install && pnpm run build",
  "outputDirectory": "apps/frontend/dist",
  "installCommand": "pnpm install",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://assignment-backend-j6gb.onrender.com/api/$1"
    }
  ]
}
```

**To use this:**
1. Commit and push the `vercel.json` file
2. Deploy normally - Vercel will use these settings

### Option B: Manual Project Settings

If you prefer manual configuration in Vercel dashboard:

**General:**
- Framework: Other
- Root Directory: `apps/frontend`
- Node.js Version: 20.x

**Build & Development Settings:**
- Build Command: `pnpm install && pnpm run build`
- Output Directory: `dist`
- Install Command: `pnpm install`

**Environment Variables:**
- `VITE_API_URL`: `https://assignment-backend-j6gb.onrender.com`

## 🔗 API Proxy Setup

Vercel automatically handles API routing through the `vercel.json` rewrites:

- Frontend calls: `/api/health` 
- Vercel proxies to: `https://assignment-backend-j6gb.onrender.com/api/health`

## 🧪 Testing Deployment

After successful deployment:

1. **Open your Vercel URL**
2. **Test Task 1:**
   - Go to `/` 
   - Click "Run Sync"
   - Should show "PostgreSQL Connected"
   - Should sync HubSpot/Stripe/Google Calendar data

3. **Test Task 2:**
   - Go to `/task2`
   - Click "Sync Stripe Test Data" 
   - Should show revenue metrics
   - Summary should match breakdown total

## 🎯 Expected Results

✅ **Frontend URL**: `https://your-project.vercel.app`  
✅ **Fast Loading**: Global CDN deployment  
✅ **API Calls**: Proxied to Render backend  
✅ **Both Tasks**: Working end-to-end  

## 🔧 Troubleshooting

### Build Fails - "pnpm not found"
**Solution**: Set Node.js version to 20.x in project settings

### API Calls Fail - CORS Errors  
**Solution**: 
1. Check `VITE_API_URL` environment variable
2. Ensure backend URL is correct: `https://assignment-backend-j6gb.onrender.com`
3. Verify `vercel.json` rewrites are configured

### Frontend Shows Blank Page
**Solution**:
1. Check build logs for errors
2. Ensure `apps/frontend/dist` directory is created
3. Verify React app builds locally first

### "Module not found" Errors
**Solution**:
1. Check `package.json` dependencies in `apps/frontend/`
2. Ensure all imports use correct paths
3. Try deleting `node_modules` and rebuilding

## 🔄 Redeployment

To redeploy after changes:

**Option 1: Git Push (Automatic)**
```bash
git add .
git commit -m "Update frontend"
git push origin main
```
Vercel automatically redeploys on push.

**Option 2: Manual Deploy**
- Go to Vercel dashboard
- Click **Deployments** 
- Click **Redeploy** on latest deployment

## 🎉 Success Indicators

✅ **Build succeeds** in Vercel dashboard  
✅ **Frontend loads** at Vercel URL  
✅ **API calls work** (check Network tab)  
✅ **Task 1 sync** shows database connection  
✅ **Task 2 metrics** display revenue data  

## 💡 Benefits of Vercel

- **Faster than Render**: Global edge network
- **Automatic HTTPS**: SSL certificates included  
- **Git Integration**: Auto-deploy on push
- **Analytics**: Built-in performance monitoring
- **Custom Domains**: Easy domain setup

Your frontend should be live and working within minutes! 🚀