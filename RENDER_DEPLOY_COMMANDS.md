# Updated Render Deploy Commands

## 🔧 Fixed Commands

The issue was with the Prisma binary path. Here are the corrected commands:

### Backend Build Command:
```bash
pnpm install --no-frozen-lockfile && cd apps/backend && pnpm exec prisma generate && pnpm build
```

### Backend Start Command:
```bash
cd apps/backend && pnpm exec prisma migrate deploy && node dist/task2/seed-allowlist.js && node dist/index.js
```

### Frontend Build Command:
```bash
pnpm install --no-frozen-lockfile && cd apps/frontend && pnpm build && cp _redirects dist/
```

## 🎯 What Changed

**❌ Old (Broken):**
```bash
../../node_modules/.pnpm/node_modules/.bin/prisma generate
```

**✅ New (Working):**
```bash
pnpm exec prisma generate
```

## 🚀 Why This Works

- `pnpm exec` automatically finds the correct binary path
- Works with pnpm's workspace structure
- No need to guess nested node_modules paths
- More reliable across different environments

## 📋 Updated Blueprint Files

All blueprint files have been updated with correct commands:
- ✅ `render-backend.yaml` - Fixed backend deployment
- ✅ `render.yaml` - Fixed combined deployment  
- ✅ `render-frontend.yaml` - Frontend deployment

## 🔄 Next Steps

1. **Commit the updated files:**
   ```bash
   git add .
   git commit -m "Fix Prisma binary paths for Render deployment"
   git push
   ```

2. **Re-deploy on Render:**
   - Should now build successfully
   - Prisma will generate and migrate properly
   - Backend will start with seeded data

The deployment should now work correctly! 🎉