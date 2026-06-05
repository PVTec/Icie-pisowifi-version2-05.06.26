# GitHub & Vercel Deployment Guide

This folder (`icie-wifi-github`) contains your complete source code, ready to upload to GitHub and deploy on Vercel.

## 📁 What's Inside

```
icie-wifi-github/
├── src/                      # All source code
│   ├── app/                 # Next.js pages
│   ├── components/          # React components (UI + custom)
│   ├── firebase/            # Firebase setup & utilities
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   └── ai/                  # Google Genkit AI features
├── public/                  # Static assets
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── tailwind.config.ts       # Tailwind CSS config
├── next.config.ts           # Next.js config
├── postcss.config.mjs       # PostCSS config
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
└── README.md                # Project documentation
```

## 🚀 Quick Start to Deploy

### Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com)
2. Click **"New"** to create a new repository
3. Name it: `icie-wifi-portal` (or your preferred name)
4. Choose **Public** repository
5. Click **"Create repository"**

### Step 2: Push to GitHub

Open terminal in the `icie-wifi-github` folder and run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Icie Wifi Portal source code"

# Add remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/icie-wifi-portal.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository
5. Click **"Import"**
6. In **Environment Variables** section, add:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
GOOGLE_GENAI_API_KEY=your_genai_key_here
```

7. Click **"Deploy"**
8. Wait for deployment to complete (2-5 minutes)
9. Click the provided URL to see your live app!

## 📋 Before You Upload

### Test Locally First

```bash
# Install dependencies
npm install

# Create .env.local from .env.example
cp .env.example .env.local

# Add your Firebase credentials to .env.local

# Test build
npm run build

# Start production server
npm start
```

If everything works locally, you're ready to upload!

### What NOT to Upload

❌ `.env.local` - Contains sensitive credentials
❌ `node_modules/` - Automatically installed by `npm install`
❌ `.next/` - Build artifacts
❌ `firebase-debug.log` - Debug logs
❌ `.DS_Store` - OS files

✅ All these are excluded by `.gitignore`

## 🔑 Environment Variables for Vercel

### Where to Get Values

**Firebase Credentials:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click ⚙️ (Settings) → "Project Settings"
4. Scroll to "Your apps" section
5. Copy all values shown

**Google GenAI Key:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API key"
3. Copy the generated key

### Required Variables

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | From Firebase |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | From Firebase |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | From Firebase |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From Firebase |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From Firebase |
| `GOOGLE_GENAI_API_KEY` | From Google AI Studio |

## ✅ Deployment Checklist

Before pushing to GitHub:

- [ ] Local build works: `npm run build`
- [ ] No build errors
- [ ] `.env.local` is **NOT** committed (check `.gitignore`)
- [ ] `.env.example` has placeholders (no real credentials)
- [ ] `node_modules/` is NOT in the folder
- [ ] All source files are copied to `src/`
- [ ] `public/` folder is included
- [ ] Configuration files present:
  - [ ] `package.json`
  - [ ] `tsconfig.json`
  - [ ] `next.config.ts`
  - [ ] `tailwind.config.ts`
  - [ ] `postcss.config.mjs`

## 📊 After Deployment

### Verify Your App

1. Open the Vercel URL provided after deployment
2. Test all features:
   - [ ] Homepage loads
   - [ ] Login/Signup works
   - [ ] Dashboard accessible
   - [ ] No console errors (F12 → Console)

### Monitor Your App

- **Vercel Dashboard**: Check deployment logs and analytics
- **Firebase Console**: Monitor Firestore usage and security
- **Performance**: Check Vercel analytics for page load times

## 🔄 Continuous Deployment

After initial setup:

1. Make changes locally
2. Test locally: `npm run dev`
3. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
4. Vercel automatically deploys your changes!

## 🛠️ Useful Commands

```bash
# Development
npm run dev

# Build locally
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Production server
npm start

# AI features
npm run genkit:dev
```

## 🆘 Troubleshooting

### Build Fails on Vercel

1. Check Vercel logs: Dashboard → Deployments → Failed deployment
2. Common issues:
   - Missing environment variables
   - TypeScript errors
   - Missing dependencies

**Fix**: Run `npm run typecheck` locally first

### App Loads But Shows Errors

1. Open browser console (F12 → Console)
2. Check error messages
3. Verify environment variables in Vercel dashboard

### Firebase Connection Issues

1. Check environment variables match your Firebase project
2. Verify Firebase security rules allow access
3. Check firestore.rules is deployed

## 📚 Resources

- **GitHub Docs**: https://docs.github.com
- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **Google Genkit**: https://firebase.google.com/docs/genkit

## 🎉 That's It!

Your app is now ready for the world! The folder is clean, contains only necessary files, and is optimized for GitHub and Vercel deployment.

**Questions?** Check the documentation links above or review the troubleshooting section.

---

**Remember**: Never commit `.env.local` - always use environment variables in Vercel dashboard!
