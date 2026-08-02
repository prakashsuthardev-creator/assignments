# Alternative Frontend Deployment Methods

Since the blueprint isn't working correctly, here are alternative approaches:

## Option 1: Manual Static Site Setup (Recommended)

### Step 1: Create Static Site Service Manually

1. Go to https://dashboard.render.com
2. Click **New** → **Static Site**
3. Connect your GitHub repository: `prakashsuthardev-creator/assignments`
4. Configure:

**Basic Settings:**
- **Name**: `assignment-frontend`
- **Branch**: `main`
- **Root Directory**: Leave blank

**Build Settings:**
- **Build Command**: 
  ```bash
  cd apps/frontend && pnpm install && pnpm run build && cp _redirects dist/
  ```
- **Publish Directory**: `apps/frontend/dist`

**Environment Variables:**
- `NODE_VERSION` = `20.20.0`
- `VITE_API_URL` = `https://assignment-backend.onrender.com`

5. Click **Create Static Site**

### Step 2: Add Redirects (Important!)

After the site deploys:
1. Go to your static site settings
2. Navigate to **Redirects/Rewrites** 
3. Add this rule:
   - **Source**: `/api/*`
   - **Destination**: `https://assignment-backend.onrender.com/api/:splat`
   - **Action**: Rewrite (200)

## Option 2: Use Netlify (Alternative Platform)

If Render continues to have issues:

1. **Push to GitHub** (already done)
2. **Go to Netlify**: https://netlify.com
3. **Connect GitHub repo**
4. **Configure**:
   - Build command: `cd apps/frontend && pnpm install && pnpm run build && cp _redirects dist/`
   - Publish directory: `apps/frontend/dist`
   - Environment: `VITE_API_URL=https://assignment-backend.onrender.com`

## Option 3: Fix Root Package.json Build (Current Approach)

I've updated the root `package.json` build script:

**Before:**
```json
"build": "pnpm -r build"
```

**After:**
```json  
"build": "cd apps/frontend && pnpm install && pnpm run build && cp _redirects dist/"
```

This way when Render runs the default `pnpm run build`, it will build only the frontend.

## Option 4: Vercel (Another Alternative)

1. **Go to Vercel**: https://vercel.com
2. **Import project** from GitHub
3. **Configure**:
   - Framework: React
   - Root Directory: `apps/frontend`
   - Build Command: `pnpm run build`
   - Output Directory: `dist`
   - Environment: `VITE_API_URL=https://assignment-backend.onrender.com`

## 🎯 Recommended Approach

**For Quick Success**: Use **Option 1 (Manual Static Site)**
- Most reliable 
- Full control over settings
- Can add custom redirects easily

## 🔧 Current Status

✅ **Backend**: Should be working (using blueprint)
⏳ **Frontend**: Try Option 1 above

## 🔄 After Frontend is Live

Test the full application:
1. **Frontend URL**: `https://assignment-frontend.onrender.com`
2. **Test Task 1**: Go to `/` and click "Run Sync"
3. **Test Task 2**: Go to `/task2` and click "Sync Stripe Test Data"

Both should work with the deployed backend! 🎉