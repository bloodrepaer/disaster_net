# Phase 5: Disaster Relief Web Platform

> Complete React-based UI system with 4 role-based dashboards, TypeScript support, Tailwind CSS styling, and full API integration with Phase 1-4 backend.

## 📊 Overview

Phase 5 delivers a comprehensive web interface for the disaster relief platform with dedicated dashboards for four stakeholder groups:

- **👤 Victim Portal**: Search missing persons, view family status, request compensation
- **🚨 Rescuer Portal**: Report rescue operations, manage rescue bundles, track team activities
- **⚕️ Medic Portal**: Manage triage queue, submit medical assessments, issue clearances
- **🏛️ Organization Portal**: Track operation metrics, manage funds, monitor blockchain status, verify volunteers

## 🏗️ Architecture

### Technology Stack

- **Frontend Framework**: React 18.2 with React Router v6
- **Language**: TypeScript 5.2
- **Styling**: Tailwind CSS 3.3
- **State Management**: Zustand (for local state), React Query (for server state)
- **HTTP Client**: Axios with JWT/NEAR interceptors
- **Build Tool**: Vite 5.0
- **Authentication**: JWT tokens + NEAR Wallet SDK

### Project Structure

```
web/
├── src/
│   ├── App.tsx                          # Main router component
│   ├── main.tsx                         # Application entry point
│   ├── index.css                        # Global styles + Tailwind imports
│   ├── types/
│   │   └── index.ts                     # TypeScript type definitions
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts               # Axios client with interceptors
│   │   │   ├── persons.ts              # Person CRUD operations
│   │   │   ├── bundles.ts              # Bundle submission & management
│   │   │   ├── compensation.ts         # Compensation requests & claims
│   │   │   ├── medical.ts              # Medical assessments
│   │   │   ├── operations.ts           # Organization metrics
│   │   │   └── index.ts                # API services exports
│   │   └── auth/
│   │       ├── authContext.tsx         # React context for authentication
│   │       └── authService.ts          # Auth service (JWT, NEAR)
│   ├── components/
│   │   └── common/
│   │       ├── ProtectedRoute.tsx      # Route guard with RBAC
│   │       ├── LoadingSpinner.tsx      # Loading indicator
│   │       └── NotFound.tsx            # 404 page
│   └── pages/
│       ├── Login.tsx                   # Login with email/NEAR
│       ├── VictimHome.tsx              # Victim dashboard
│       ├── RescuerHome.tsx             # Rescuer dashboard
│       ├── MedicHome.tsx               # Medic dashboard
│       └── OrgHome.tsx                 # Organization dashboard
├── public/
├── index.html                           # HTML entry point
├── vite.config.ts                       # Vite configuration
├── tsconfig.json                        # TypeScript configuration
├── tailwind.config.js                   # Tailwind CSS configuration
├── postcss.config.js                    # PostCSS configuration
├── package.json                         # Dependencies
├── .env.example                         # Environment variables template
└── .eslintrc.cjs                        # ESLint configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm 8+
- Backend API running (Phase 1-4 implementation)
- NEAR testnet account (optional, for NEAR Wallet login)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your backend URL and NEAR contract details
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```
   
   Server will run on `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview  # Preview production build locally
```

## 🔐 Authentication Flow

### Email/Password Login
1. User enters email and password
2. `AuthService.login()` sends credentials to backend `/api/v1/auth/login`
3. Backend returns JWT token
4. Token stored in localStorage with expiration
5. User redirected to role-specific dashboard

### NEAR Wallet Login
1. User clicks "Sign in with NEAR"
2. `AuthService.loginWithNEAR()` triggers NEAR wallet connection
3. NEAR Wallet signs authentication payload
4. Signature verified on backend `/api/v1/auth/near/login`
5. JWT token issued and stored
6. User redirected to role dashboard

### Token Management
- JWT tokens automatically attached to all API requests via Axios interceptors
- 401 responses trigger automatic logout and redirect to `/login`
- Token refresh handled by backend (if configured)

## 🎯 Dashboard Features

### Victim Portal (`/victim`)
- **Search Missing Persons**: Search by name, phone, zone
- **Family Status**: View missing, found, deceased family members
- **Compensation Requests**: Request OTP, verify claim eligibility
- **Claim History**: Track all compensation claims and status
- **Real-time Notifications**: Updates on family member status changes

### Rescuer Portal (`/rescuer`)
- **Dashboard**: View operation metrics and recent rescues
- **Submit Reports**: Log rescue operations with victim details
- **Bundle Management**: Group records into bundles for blockchain anchoring
- **Team Coordination**: View team members and their status
- **Blockchain Status**: Check bundle anchoring status on Starknet

### Medic Portal (`/medic`)
- **Triage Queue**: Prioritized list of patients awaiting assessment
- **Medical Assessment**: Record vital signs and clinical observations
- **Patient Records**: Access patient history and assessments
- **Medical Clearance**: Issue recovery certificates
- **Statistics**: Track daily clearances and assessments

### Organization Portal (`/org`)
- **Operation Metrics**: Real-time dashboard with key statistics
- **Blockchain Status**: Monitor Starknet and Ronin networks
- **Fund Management**: Track compensation fund distribution
- **Performance Analytics**: Response time, success rates, recovery trends
- **Volunteer Verification**: Approve/reject volunteer applications
- **Audit Trail**: Complete transaction and action log

## 🔌 API Integration

All dashboard components communicate with Phase 1-4 backend APIs through typed service layer:

### Available Services

#### Person Service (`src/services/api/persons.ts`)
- `search()` - Search persons by criteria
- `getById()` - Get person details
- `create()` - Register new person
- `updateStatus()` - Update person status (MISSING/FOUND/DECEASED)
- `addConfirmation()` - Rescuer reports finding someone
- `getFamilyMembers()` - Get related family members
- `getTimeline()` - Get person's status updates history

#### Bundle Service (`src/services/api/bundles.ts`)
- `submit()` - Submit rescue bundle
- `getById()` - Get bundle details
- `getStatus()` - Get blockchain anchoring status
- `anchor()` - Anchor bundle on Starknet
- `getPending()` - Get bundles awaiting anchoring
- `getRecent()` - Get recently submitted bundles

#### Compensation Service (`src/services/api/compensation.ts`)
- `requestOTP()` - Request OTP for claim
- `verifyOTP()` - Verify OTP and process claim
- `getStatus()` - Get compensation status
- `getActiveClaims()` - Get all active claims
- `updateBankAccount()` - Update payment details
- `approveClaim()` - Admin approval (org role)
- `getRoninTransactions()` - Get fund transfers on Ronin

#### Medical Service (`src/services/api/medical.ts`)
- `getTriageQueue()` - Get patients awaiting assessment
- `submitAssessment()` - Save medical assessment
- `getAssessmentByPersonId()` - Get patient assessments
- `issueClearance()` - Issue medical clearance
- `getTodaysClearances()` - Get clearances issued today
- `getStats()` - Get medical statistics

#### Operations Service (`src/services/api/operations.ts`)
- `getMetrics()` - Get operation overview metrics
- `getBlockchainStatus()` - Get Starknet/Ronin status
- `getZoneMetrics()` - Get metrics by rescue zone
- `getResponseTimeAnalytics()` - Get performance analytics
- `getDailyProgress()` - Get daily trend data
- `getFundingStatus()` - Get fund allocation details
- `getVolunteerStats()` - Get volunteer statistics
- `getPendingVolunteers()` - Get applications awaiting verification

## 🎨 UI Components

### Common Components
- **ProtectedRoute** - Role-based access control wrapper
- **LoadingSpinner** - Loading indicator
- **NotFound** - 404 error page

### Layout Patterns
All dashboards use consistent patterns:
- Header with logout
- Tab navigation for feature sections
- Card-based metric displays
- Data tables with status badges
- Form inputs for data submission
- Modal dialogs for confirmations

## 🔑 Role-Based Access Control (RBAC)

Role validation happens at multiple levels:

1. **Route Protection**: `ProtectedRoute` component checks role before rendering
2. **API Client**: JWT token identifies user role to backend
3. **UI Permissions**: Components conditionally render based on user role

Role matrix:
- **VICTIM**: Can search persons, request compensation, view claims
- **RESCUER**: Can submit reports, create bundles, see team dashboard
- **MEDIC**: Can access triage queue, submit assessments, issue clearances
- **ORG**: Can view all metrics, manage funds, verify volunteers

## 🌐 Environment Configuration

Create `.env.local` file:

```env
# Backend API
VITE_API_URL=http://localhost:3000/api/v1

# NEAR Blockchain
VITE_NEAR_NETWORK=testnet
VITE_NEAR_CONTRACT_ID=disaster-relief.testnet

# WebSocket (real-time updates)
VITE_WS_URL=ws://localhost:3000/ws

# App metadata
VITE_APP_NAME=Disaster Relief Platform
VITE_APP_VERSION=5.0.0
VITE_ENV=development
```

## 📱 Responsive Design

All components use Tailwind CSS breakpoints:
- Mobile-first approach
- Grid layouts adapt to screen size
- Touch-friendly buttons and inputs
- Mobile menu navigation ready

## 🔄 Real-time Features

WebSocket support structure ready for:
- Person status change notifications
- Compensation claim updates
- Medical assessment alerts
- Bundle anchoring confirmations
- Team member activity feeds

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## 📦 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Manual Deployment
```bash
npm run build
# Upload `dist/` folder to hosting service
```

## 🚩 TypeScript Support

Full type safety across the application:
- Typed API responses from service layer
- Component props typed with interfaces
- Custom types in `src/types/index.ts`
- Strict mode enabled in tsconfig

## 📚 Development Guidelines

### Adding a New Component
```typescript
import React from 'react';

export function MyComponent() {
  return (
    <div className="p-4">
      {/* Component content */}
    </div>
  );
}
```

### Using API Services
```typescript
import { personService } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

export function PersonSearch() {
  const { data, isLoading } = useQuery({
    queryKey: ['persons'],
    queryFn: () => personService.search({ name: 'Ahmed' })
  });

  if (isLoading) return <LoadingSpinner />;
  return <div>{/* Render results */}</div>;
}
```

### Accessing Auth Context
```typescript
import { useAuthContext } from '@/services/auth/authContext';

export function UserProfile() {
  const { user, logout } = useAuthContext();
  return <div>{user?.email}</div>;
}
```

## 🤝 Integration Points

Phase 5 integrates with:
- **Phase 1**: Person identity verification APIs
- **Phase 2**: Medical assessment database
- **Phase 3**: Rescue operation logging
- **Phase 4**: Blockchain anchoring and compensation distribution

## 📈 Metrics & Analytics

Dashboard displays include:
- Real-time operation counts
- Performance analytics (response times, success rates)
- Daily progress trends
- Geographic distribution (by zone)
- Budget tracking and fund allocation

## 🔒 Security Features

- JWT token-based authentication
- NEAR Wallet integration for decentralized auth
- CORS-enabled API communication
- Secure token storage in localStorage with expiration
- Automatic logout on 401 responses
- Role-based route protection
- Typed API responses prevent injection attacks

## 📞 Support & Contact

For issues or questions about Phase 5 implementation:
- Check `phase5_architecture.md` for detailed specifications
- Review API service documentation in `src/services/api/`
- Consult TypeScript types in `src/types/index.ts`

## 📋 Checklist for Going Live

- [ ] Backend API running and accessible
- [ ] Environment variables configured
- [ ] NEAR testnet account setup (if using NEAR login)
- [ ] Database migrations complete
- [ ] SSL certificates configured
- [ ] CORS settings validated
- [ ] Rate limiting configured
- [ ] Monitoring and logging setup
- [ ] User documentation prepared
- [ ] Staff training completed

## 🎉 Phase 5 Complete!

All 4 role-based dashboards implemented with:
- ✅ 4 dashboard home pages
- ✅ 5 API service modules (persons, bundles, compensation, medical, operations)
- ✅ Complete authentication system (JWT + NEAR)
- ✅ Role-based access control
- ✅ TypeScript type safety
- ✅ Tailwind CSS styling
- ✅ Responsive design
- ✅ Production-ready configuration

**Status**: Ready for integration testing with Phase 1-4 backend
