# Phase 5 Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd web
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local` and set your backend URL:
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_NEAR_NETWORK=testnet
```

### Step 3: Start Development Server
```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Step 4: Login with Demo Credentials

**Test Accounts** (get from backend):

| Role | Email | Password |
|------|-------|----------|
| Victim | victim@example.com | password123 |
| Rescuer | rescuer@example.com | password123 |
| Medic | medic@example.com | password123 |
| Org | org@example.com | password123 |

**Or use NEAR Wallet** - Click "Sign in with NEAR" and connect your testnet wallet

## 📊 Dashboard Tours

### 1️⃣ Victim Dashboard (`/victim`)
- **Search**: Try searching for "Ahmed Hassan"
- **Family Status**: View missing family members
- **Compensation**: See ready-to-claim compensation
- **Notifications**: Check for status updates

### 2️⃣ Rescuer Dashboard (`/rescuer`)
- **Dashboard Tab**: View operation metrics
- **Report Tab**: Submit a new rescue operation
- **Bundles Tab**: See submitted rescue bundles
- **Team Tab**: View rescue team members

### 3️⃣ Medic Dashboard (`/medic`)
- **Triage Queue**: See 5 patients waiting for assessment
- **Assessment**: Submit medical assessments
- **Records**: View patient history
- **Clearance**: See issued recovery certificates

### 4️⃣ Organization Dashboard (`/org`)
- **Overview**: High-level operation metrics
- **Metrics**: Performance analytics and trends
- **Blockchain**: Check Starknet/Ronin status
- **Funds**: Compensation distribution tracking
- **Volunteers**: Manage volunteer applications

## 🔧 Common Tasks

### Make API Calls
```typescript
import { personService } from '@/services/api';

const results = await personService.search({ 
  name: 'Ahmed',
  zone: 'Zone-A'
});
```

### Access Current User
```typescript
import { useAuthContext } from '@/services/auth/authContext';

export function MyComponent() {
  const { user, logout } = useAuthContext();
  
  return <p>Welcome, {user?.email}</p>;
}
```

### Create New Component
```typescript
// src/pages/MyPage.tsx
import React from 'react';

export function MyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Your content */}
    </div>
  );
}
```

## 🐛 Troubleshooting

### "Cannot GET /"
- Make sure you're running `npm run dev`
- Default port is 3000, check if it's available

### "API request failed"
- Verify backend is running on `VITE_API_URL`
- Check CORS settings on backend
- Look at browser console network tab for details

### "Login doesn't work"
- Ensure backend auth endpoints are working
- Check JWT token is being stored in localStorage
- Verify role is correctly set for the test account

### Tailwind CSS not loading
- Run `npm install` again
- Restart dev server: `npm run dev`
- Verify `tailwind.config.js` exists

## 📦 Build for Production

```bash
# Type check
npm run type-check

# Build
npm run build

# Test production build
npm run preview
```

Output will be in `dist/` folder

## 🔑 Key Files to Modify

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main router - add new routes here |
| `src/types/index.ts` | TypeScript types - define data models |
| `src/services/api/` | API calls - add new endpoints |
| `src/pages/` | Dashboard components - main UI |
| `tailwind.config.js` | Styling - customize colors/fonts |
| `.env.local` | Configuration - backend URL, etc |

## 📚 Full Documentation

- **Architecture**: See `phase5_architecture.md` for complete design
- **API Services**: Check `src/services/api/` for available endpoints
- **Type Definitions**: See `src/types/index.ts` for all data types
- **Component Examples**: Look at dashboard files for UI patterns

## ✅ Deployment Checklist

- [ ] Run `npm run build` - no errors
- [ ] Test production build with `npm run preview`
- [ ] Set environment variables for production
- [ ] Upload `dist/` folder to hosting
- [ ] Test login flow on production
- [ ] Verify API calls work with production backend
- [ ] Set up SSL certificate
- [ ] Configure custom domain

## 🎯 Next Steps

1. **Connect to Real Backend**
   - Update `VITE_API_URL` in `.env.local`
   - Test with real API endpoints

2. **Add Real-time Features**
   - Implement WebSocket in `authService.ts`
   - Add notification system with Zustand store

3. **Deploy to Vercel**
   - Push to GitHub
   - Connect repository to Vercel
   - Set environment variables
   - Deploy!

## 📞 Need Help?

Check these resources:
- React Router Docs: https://reactrouter.com
- Tailwind CSS Docs: https://tailwindcss.com
- TypeScript Docs: https://www.typescriptlang.org
- Vite Docs: https://vitejs.dev

Happy coding! 🎉
