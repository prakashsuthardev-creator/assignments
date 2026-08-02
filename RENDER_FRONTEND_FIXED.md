# Deploy Frontend on Render (Fixed Build Loop)

## ✅ Build Loop Issue Fixed

The infinite loop was caused by the root `package.json` build script. I've fixed this by:
- Root build script now uses workspace build (`pnpm -r build`)
- Frontend-specific build moved to `build:frontend`
- Render can now use direct commands without triggering loops

## 🚀 Deploy Frontend on Render - Step by Step

### Step 1: Push Fixed Code
```bash
git add .
git commit -m "Fix build loop - ready for Render frontend deployment"
git push origin main
```

### Step 2: Create Static Site on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click**: New → **Static Site**
3. **Connect Repository**: `prakashsuthardev-creator/assignments`
4. **Configure Settings**:

### Step 3: Build Configuration

**Name**: `assignment-frontend`

**Branch**: `main`

**Root Directory**: Leave blank

**Build Command**:
```bash
cd apps/frontend && pnpm install --frozen-lockfile=false && pnpm run build && cp _redirects dist/
```

**Publish Directory**:
```bash
apps/frontend/dist
```

### Step 4: Environment Variables

Add these after creating the service:

| Key | Value |
|-----|-------|
| `NODE_VERSION` | `20.20.0` |
| `VITE_API_URL` | `https://assignment-backend-j6gb.onrender.com` |

### Step 5: Deploy

1. **Click Create Static Site**
2. **Wait for build** (should complete in 2-3 minutes)
3. **No more build loops!** ✅

## 🔧 Alternative: Manual Static Site Setup

If you prefer more control:

### Build Settings:
- **Build Command**: `cd apps/frontend && pnpm install --frozen-lockfile=false && pnpm run build && cp _redirects dist/`
- **Publish Directory**: `apps/frontend/dist`
- **Auto-Deploy**: Yes

### Advanced Settings:
- **Node Version**: `20.20.0`
- **Environment**: Production

## 📋 Why This Works Now

### Before (Loop Problem):
```bash
1. Render runs: pnpm run build (from root)
2. Root build: cd apps/frontend && ... pnpm run build
3. This triggers workspace build again
4. Infinite loop! 🔄
```

### After (Fixed):
```bash
1. Render runs: cd apps/frontend && pnpm install && pnpm run build
2. Direct frontend build - no root script involved
3. Builds React app successfully ✅
4. Copies _redirects file ✅
5. Creates dist/ directory ✅
```

## 🔗 API Redirects Setup

After deployment, add redirects in Render:

1. **Go to Static Site Settings**
2. **Redirects/Rewrites** tab
3. **Add Rule**:
   - **Source**: `/api/*`
   - **Destination**: `https://assignment-backend-j6gb.onrender.com/api/:splat`
   - **Status**: 200 (Rewrite)

## ✅ Expected Build Log

You should see clean build output like:
```
==> Running build command 'cd apps/frontend && pnpm install --frozen-lockfile=false && pnpm run build && cp _redirects dist/'
📦 Installing dependencies...
🔨 Building with Vite...
✅ Build completed
📄 Copying _redirects...
==> Build successful 🎉
```

## 🧪 Testing After Deployment

1. **Open your Render frontend URL**
2. **Test Task 1**: Go to `/` and click "Run Sync" 
3. **Test Task 2**: Go to `/task2` and click "Sync Stripe Test Data"
4. **Check Network Tab**: API calls should go to backend

## 🎯 Benefits of Using Render for Frontend

✅ **No Build Loops**: Fixed configuration  
✅ **Same Provider**: Frontend and backend on same platform  
✅ **Easy Redirects**: Built-in proxy configuration  
✅ **Consistent Environment**: Same deployment flow  

## 🔄 If Build Still Has Issues

Try this alternative build command:
```bash
pnpm install --frozen-lockfile=false && cd apps/frontend && pnpm run build && cp _redirects dist/
```

Or this minimal version:
```bash
cd apps/frontend && npm install && npm run build && cp _redirects dist/
```

## 🚀 Quick Deploy Link

Once you commit the fixes, you can deploy directly:
- **Render Static Site**: https://dashboard.render.com/select-repo?type=static
- **Select Repository**: assignments
- **Use settings above**

Your frontend should deploy successfully on Render now! 🎉