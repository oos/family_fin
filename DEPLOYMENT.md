# Family Finance Management - Render Deployment Guide

## Prerequisites
1. A Render account (sign up at https://render.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### 1. Prepare Your Repository
Make sure all files are committed and pushed to your Git repository:
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Deploy to Render

#### Option A: Using render.yaml (Recommended)
1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint"
3. Connect your Git repository
4. Render will automatically detect the `render.yaml` file
5. Click "Apply" to deploy all services

#### Option B: Manual Setup
If you prefer to set up services manually:

**Backend API:**
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Name**: `family-finance-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements-prod.txt && flask db upgrade`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT wsgi:app`
   - **Health Check Path**: `/api/health`

**Frontend:**
1. Click "New +" → "Static Site"
2. Connect your Git repository
3. Configure:
   - **Name**: `family-finance-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
   - **Environment Variables**:
     - `REACT_APP_API_URL`: `https://family-finance-api.onrender.com`

**Database:**
1. Click "New +" → "PostgreSQL"
2. Configure:
   - **Name**: `family-finance-db`
   - **Plan**: Starter (Free tier)

### 3. Environment Variables
Set these environment variables in your Render dashboard:

**Backend API:**
- `FLASK_APP`: `app.py`
- `FLASK_ENV`: `production`
- `DATABASE_URL`: (Auto-generated from PostgreSQL service)
- `SECRET_KEY`: (Generate a secure random string)
- `CORS_ORIGINS`: `https://family-finance-frontend.onrender.com`

**Frontend:**
- `REACT_APP_API_URL`: `https://family-finance-api.onrender.com`

### 4. Database Migration
After deployment, the database will be automatically migrated using the `flask db upgrade` command in the build process.

### 5. Access Your Application
- **Frontend**: `https://family-finance-frontend.onrender.com`
- **Backend API**: `https://family-finance-api.onrender.com`
- **Health Check**: `https://family-finance-api.onrender.com/api/health`

## Troubleshooting

### Common Issues:
1. **Build Failures**: Check the build logs in Render dashboard
2. **Database Connection**: Ensure DATABASE_URL is correctly set
3. **CORS Issues**: Verify CORS_ORIGINS includes your frontend URL
4. **Static Files**: Ensure build directory is correctly configured

### Logs:
- View logs in the Render dashboard under each service
- Backend logs: Service → Logs tab
- Frontend logs: Service → Logs tab

## Production Considerations

1. **Security**: 
   - Use strong SECRET_KEY
   - Enable HTTPS (automatic on Render)
   - Review CORS settings

2. **Performance**:
   - Consider upgrading to paid plans for better performance
   - Monitor resource usage

3. **Backups**:
   - Regular database backups
   - Code repository backups

4. **Monitoring**:
   - Set up health checks
   - Monitor error rates
   - Set up alerts

## Support
- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
