# Quick Deploy to Render 🚀

Follow these steps to deploy your application to Render quickly.

## 1. Prepare Your Code

✅ All configuration files are ready:
- `render.yaml` - Blueprint configuration
- `package.json` - Root workspace config  
- `.gitignore` - Ignore sensitive files
- `apps/frontend/_redirects` - API proxy rules

## 2. Push to GitHub

```bash
# If not already a git repo
git init
git add .
git commit -m "Initial commit - Assignment 1 & 2 complete"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## 3. Deploy with Render Blueprint

### Option A: One-Click Deploy (Recommended)

1. Go to https://render.com/deploy
2. Paste your GitHub repository URL
3. Click **Apply** - Render will detect `render.yaml` and create:
   - PostgreSQL database
   - Backend web service  
   - Frontend static site

### Option B: Import from Dashboard

1. Go to https://dashboard.render.com
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Select the repository with `render.yaml`
5. Click **Apply**

## 4. Configure Environment Variables

After deployment starts, you'll need to add your API keys:

1. Go to **assignment-backend** service
2. Click **Environment** tab
3. Add these variables:

```
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
HUBSPOT_API_KEY=pat-na2-your_hubspot_key  
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_SECERET_KEY=your_google_secret_key
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
```

4. Click **Save Changes** - service will redeploy automatically

## 5. Monitor Deployment

### Backend Service (`assignment-backend`)
- Check **Logs** tab for build progress
- Should see: ✅ Database migrations completed
- Should see: ✅ Task 2 allowlist seeded  
- Should see: 🚀 Backend server running on port 10000

### Frontend Service (`assignment-frontend`)  
- Check **Logs** tab for build progress
- Should complete in ~2-3 minutes

### Database (`assignment-db`)
- Should show **Available** status
- Contains both Task 1 and Task 2 tables

## 6. Test Your Deployment

Once both services show **Live** status:

1. **Open Frontend URL** (e.g., `https://assignment-frontend.onrender.com`)

2. **Test Task 1 (Sync Pipeline)**:
   - Should show "PostgreSQL Connected" 
   - Click "Run Sync"
   - Should sync HubSpot, Stripe, Google Calendar data

3. **Test Task 2 (Revenue Metrics)**:
   - Go to `/task2` 
   - Click "Sync Stripe Test Data"
   - Should show revenue totals and breakdown
   - Verify summary matches breakdown total

## 7. Your Live URLs

After successful deployment:

- **Frontend**: `https://assignment-frontend.onrender.com`
- **Backend API**: `https://assignment-backend.onrender.com`
- **Database**: Internal Render PostgreSQL

## 🎯 Expected Results

### Task 1 Working ✅
- Sync page loads without "In-Memory Fallback"
- Sync button pulls data from HubSpot, Stripe, Google Calendar
- Data appears in normalized table

### Task 2 Working ✅  
- Revenue metrics page loads
- Sync pulls Stripe test data + fixtures
- Summary shows total collected revenue
- Breakdown shows daily/weekly buckets
- Summary total = breakdown sum (consistency verified)

## 🔧 Troubleshooting

### "In-Memory Fallback" showing
- Check backend logs for database connection errors
- Verify `DATABASE_URL` environment variable is set
- Ensure database is **Available** status

### API calls failing  
- Check `_redirects` file is copied to `dist/` folder
- Verify frontend `VITE_API_URL` points to backend URL
- Check CORS configuration in backend

### Build failures
- Check build logs for specific errors
- Verify all `package.json` files are committed
- Ensure Node.js version is 20.x

### Prisma migration issues
- Check database permissions
- May need to run migrations manually in backend shell
- Clear and recreate database if needed

## 🚀 Production Considerations

**Free Tier Limitations:**
- Services sleep after 15 minutes of inactivity  
- ~30-60 second cold start time
- Database expires after 90 days without activity

**For Production:**
- Upgrade to paid plans for always-on services
- Add custom domain
- Set up monitoring and alerts
- Configure proper environment-specific configs

## 🎉 Success!

If all tests pass, you have successfully deployed:

✅ **Task 1**: Multi-source sync pipeline with normalized data storage  
✅ **Task 2**: Single source of truth revenue metrics with drift protection

Your application is now live and accessible worldwide! 🌍

---

**Need help?** Check the detailed `RENDER_DEPLOYMENT.md` guide or Render's documentation.