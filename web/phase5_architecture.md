# DisasterNet Phase 5: Role-Based Dashboard UI System

## Overview

Phase 5 implements a **complete role-based frontend system** with separate dashboards for 4 user types:

- 👤 **Victims** — Find family, receive compensation, claim relief
- 🚨 **Rescue Workers** — Report missing persons, confirm status, coordinate teams
- 🏥 **Medics** — Assess injuries, provide medical clearance, triage
- 🏢 **Organization** — Oversee operations, audit transactions, manage funds

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         DisasterNet Phase 5: Dashboard UI            │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────────┬──────────────┬──────────┬─────────┐ │
│ │   Victim     │   Rescue     │  Medic   │  Org    │ │
│ │ Dashboard    │   Worker     │Dashboard │Dashboard│ │
│ │              │  Dashboard   │          │         │ │
│ └──────────────┴──────────────┴──────────┴─────────┘ │
│                      │                                │
│                 ┌────v────┐                           │
│                 │ Router  │  (Role-based)             │
│                 └────┬────┘                           │
│                      │                                │
│  ┌──────────────────┼──────────────────┐              │
│  │  Auth System     │  API Client      │              │
│  │  (JWT/NEAR)      │  Library         │              │
│  └──────────────────┼──────────────────┘              │
│                      │                                │
│                 ┌────v───────────────┐                │
│                 │  Phase 1-4 API     │                │
│                 │  Backend           │                │
│                 └────────────────────┘                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Dashboard Components by Role

### 1. Victim Dashboard 👤

**Purpose:** Find family members, track compensation, claim relief

**Key Views:**
- Search missing persons by name/phone
- View person details + rescue status
- Receive notifications when person found
- Request OTP for compensation claim
- View claim history + payout status
- Family documentation upload

**Data Access:**
- Own family records only
- Own compensation status
- Public person database (search)

**Sample Layout:**
```
┌─────────────────────────────────────┐
│ DisasterNet Victim Portal           │
├─────────────────────────────────────┤
│                                     │
│  Search Missing Persons            │
│  ┌──────────────────────────────┐   │
│  │ Enter name or phone number   │   │
│  └──────────────────────────────┘   │
│                                     │
│  My Family                          │
│  ┌──────────────────────────────┐   │
│  │ Person 1: Missing [pending]  │   │
│  │ Person 2: Found [✓ confirmed]│   │
│  │ Person 3: Deceased [claimed] │   │
│  └──────────────────────────────┘   │
│                                     │
│  Compensation Status                │
│  ├─ Pending: 2 persons              │
│  ├─ Ready to Claim: 1 person        │
│  └─ Claimed: 3 persons              │
│                                     │
│  [Request Claim OTP] [History]      │
└─────────────────────────────────────┘
```

### 2. Rescue Worker Dashboard 🚨

**Purpose:** Report missing persons, coordinate teams, confirm status

**Key Views:**
- Create/update missing person reports
- View team assignments
- Real-time person status map
- Create bundles (batch sync)
- View anchor/compensation status
- Team chat + coordination

**Data Access:**
- Persons reported by own team
- Bundles submitted
- Team-wide status dashboard
- Anchor job status

**Sample Layout:**
```
┌─────────────────────────────────────┐
│ DisasterNet Rescue Worker Portal    │
├─────────────────────────────────────┤
│                                     │
│  My Team: Zone-A (5 members active) │
│                                     │
│  Quick Report Person                │
│  ┌──────────────────────────────┐   │
│  │ Name:    [____________]      │   │
│  │ Phone:   [____________]      │   │
│  │ Status:  [Missing/Found▼]   │   │
│  │ Zone:    [Zone-A▼]          │   │
│  │ [Submit Report]              │   │
│  └──────────────────────────────┘   │
│                                     │
│  Today's Reports (12 submitted)     │
│  ├─ Pending: 8 (awaiting org)      │
│  ├─ Anchored: 3 (Starknet ✓)       │
│  ├─ Confirmed: 1 (Ronin ✓)        │
│                                     │
│  Create Bundle [Sync Now]           │
└─────────────────────────────────────┘
```

### 3. Medic Dashboard 🏥

**Purpose:** Assess injuries, provide medical clearance, triage

**Key Views:**
- Patient triage list
- Medical assessment form
- Injury severity scoring
- Medical clearance for status changes
- Vaccination/health records
- Clinical notes history

**Data Access:**
- Patients in own facility/zone
- Medical assessments
- Clearance authority

**Sample Layout:**
```
┌─────────────────────────────────────┐
│ DisasterNet Medical Portal          │
├─────────────────────────────────────┤
│                                     │
│  Facility: Hospital-A (Zone-B)      │
│  Admitted: 45 patients              │
│                                     │
│  Triage Queue (8 pending)           │
│  ┌──────────────────────────────┐   │
│  │ ID    │ Name    │ Severity   │   │
│  │ 001   │ Ahmed   │ [CRITICAL] │   │
│  │ 002   │ Fatima  │ [MODERATE] │   │
│  │ 003   │ Hassan  │ [MINOR]    │   │
│  │ [View Assessment]              │   │
│  └──────────────────────────────┘   │
│                                     │
│  Medical Clearance Approvals        │
│  ├─ Pending: 3 status changes      │
│  └─ [Approve] [Review]             │
└─────────────────────────────────────┘
```

### 4. Organization Dashboard 🏢

**Purpose:** Oversee operations, manage funds, audit transactions

**Key Views:**
- Real-time operation metrics
- Fund management + disbursement
- Volunteer verification queue
- Bundle/anchor audit trail
- Blockchain transaction verification
- Zone-level coordination
- Compensation unlock approvals

**Data Access:**
- All data (read-only or admin)
- Transaction audit logs
- Volunteer registry
- Fund allocation

**Sample Layout:**
```
┌─────────────────────────────────────────┐
│ DisasterNet Organization Portal         │
├─────────────────────────────────────────┤
│                                         │
│  Operations Dashboard                  │
│  ├─ Total Persons: 1,234                │
│  ├─ Found: 987 (79.9%)                 │
│  ├─ Missing: 247 (20.1%)               │
│  ├─ Deceased: 89 (7.2%)                │
│  ├─ Compensation Paid: $56,000         │
│  └─ Funds Remaining: $144,000          │
│                                         │
│  Blockchain Status                      │
│  ├─ Bundles Anchored: 156 (Starknet)   │
│  ├─ Confirmations: 89 (2+ rescuers)    │
│  ├─ Compensation Unlocked: 67          │
│  ├─ Pending Consensus: 22              │
│  └─ Failed: 1                          │
│                                         │
│  Financial Overview                     │
│  ├─ Total Allocated: $200,000          │
│  ├─ Distributed: $56,000 (28%)        │
│  ├─ Pending Claims: 22                 │
│  ├─ Fund Health: ✓ Secure              │
│  └─ [Transaction Audit Trail]          │
└─────────────────────────────────────────┘
```

## Technology Stack

### Frontend Framework
- **React 18** — UI components
- **TypeScript** — Type safety
- **React Router v6** — Role-based routing
- **Tailwind CSS** — Styling
- **Zustand** — State management
- **React Query** — Data fetching + caching

### API Integration
- **Axios** — HTTP client
- **JWT** — Authentication
- **NEAR Wallet SDK** — Web3 login

### Charts & Visualization
- **Recharts** — Data visualization
- **Mapbox GL** — Zone mapping
- **Chart.js** — Statistics

### Build & Deployment
- **Vite** — Build tool
- **Vercel** — Hosting
- **GitHub Actions** — CI/CD

## File Structure

```
web/
├── public/
│   └── index.html
│
├── src/
│   ├── components/
│   │   ├── common/               [Shared components]
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── NotificationBell.tsx
│   │   │
│   │   ├── victim/              [Victim Dashboard]
│   │   │   ├── PersonSearch.tsx
│   │   │   ├── FamilyStatus.tsx
│   │   │   ├── CompensationClaim.tsx
│   │   │   └── ClaimHistory.tsx
│   │   │
│   │   ├── rescuer/             [Rescue Worker Dashboard]
│   │   │   ├── ReportForm.tsx
│   │   │   ├── TeamDashboard.tsx
│   │   │   ├── BundleManager.tsx
│   │   │   └── AnchorStatus.tsx
│   │   │
│   │   ├── medic/               [Medic Dashboard]
│   │   │   ├── TriageQueue.tsx
│   │   │   ├── Assessment.tsx
│   │   │   ├── MedicalClearance.tsx
│   │   │   └── PatientRecords.tsx
│   │   │
│   │   └── org/                 [Organization Dashboard]
│   │       ├── OperationMetrics.tsx
│   │       ├── BlockchainStatus.tsx
│   │       ├── FundManagement.tsx
│   │       ├── AuditTrail.tsx
│   │       └── VolunteerQueue.tsx
│   │
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── VictimHome.tsx
│   │   ├── RescuerHome.tsx
│   │   ├── MedicHome.tsx
│   │   ├── OrgHome.tsx
│   │   └── 404.tsx
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts        [API client setup]
│   │   │   ├── persons.ts       [Person endpoints]
│   │   │   ├── volunteers.ts    [Volunteer endpoints]
│   │   │   ├── bundles.ts       [Bundle endpoints]
│   │   │   └── compensation.ts  [Compensation endpoints]
│   │   │
│   │   ├── auth/
│   │   │   ├── authService.ts   [JWT + NEAR auth]
│   │   │   ├── roleCheck.ts     [Role validation]
│   │   │   └── keycloak.ts      [SSO integration]
│   │   │
│   │   └── storage/
│   │       └── localStorage.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useRole.ts
│   │   ├── usePersons.ts
│   │   └── useCompensation.ts
│   │
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── personStore.ts
│   │   └── notificationStore.ts
│   │
│   ├── utils/
│   │   ├── date.ts
│   │   ├── currency.ts
│   │   └── validators.ts
│   │
│   ├── types/
│   │   ├── user.ts
│   │   ├── person.ts
│   │   └── compensation.ts
│   │
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
│
├── tests/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── hooks/
│
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## Role-Based Access Control (RBAC)

### Roles & Permissions

```javascript
ROLES: {
  VICTIM: {
    permissions: ['search_persons', 'view_family', 'request_otp', 'claim_compensation'],
    routes: ['/victim/*']
  },
  RESCUER: {
    permissions: ['create_report', 'submit_bundle', 'view_team', 'confirm_status'],
    routes: ['/rescuer/*']
  },
  MEDIC: {
    permissions: ['assess_patient', 'issue_clearance', 'view_medical_records'],
    routes: ['/medic/*']
  },
  ORG: {
    permissions: ['view_all_data', 'audit_transactions', 'manage_funds', 'verify_volunteers'],
    routes: ['/org/*']
  }
}
```

### Authentication Flow

```
User Login (NEAR/Email)
      ↓
Identify Role (from NEAR ID or database)
      ↓
Generate JWT Token
      ↓
Store in localStorage + sessionStorage
      ↓
Route to Role Dashboard
      ↓
API calls include JWT header
      ↓
Backend validates token + role
      ↓
Return role-specific data
```

## Data Models (TypeScript)

```typescript
// User/Role
interface User {
  id: string;
  nearId: string;
  email: string;
  role: 'VICTIM' | 'RESCUER' | 'MEDIC' | 'ORG';
  zone?: string;
  organization?: string;
  createdAt: Date;
  verifiedAt?: Date;
}

// Person (Missing Person)
interface Person {
  id: string;
  name: string;
  phone: string;
  status: 'Missing' | 'Found' | 'Deceased' | 'Unknown';
  zone: string;
  reportedBy: string;
  reportedAt: Date;
  lastSeen?: string;
  description?: string;
  photo?: string;
  confirmations: Confirmation[];
  compensation?: Compensation;
}

// Compensation
interface Compensation {
  id: string;
  personId: string;
  amount: number;
  status: 'Pending' | 'Unlocked' | 'Claimed';
  ronin_txHash?: string;
  unlockedAt?: Date;
  claimedAt?: Date;
  claimedBy?: string;
}

// Medical Assessment
interface MedicalAssessment {
  id: string;
  personId: string;
  assessor: string;
  severity: 'CRITICAL' | 'MODERATE' | 'MINOR';
  injuries: string[];
  clearance: boolean;
  notes: string;
  timestamp: Date;
}
```

## API Integration (Client Library)

```typescript
// services/api/client.ts
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8787',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach JWT to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// services/api/persons.ts
export const personsAPI = {
  search: (query: string) =>
    apiClient.get(`/api/v1/persons/search`, { params: { q: query } }),
  
  getById: (id: string) =>
    apiClient.get(`/api/v1/persons/${id}`),
  
  updateStatus: (id: string, status: PersonStatus) =>
    apiClient.post(`/api/v1/persons/${id}/status`, { status }),
  
  create: (data: CreatePersonInput) =>
    apiClient.post(`/api/v1/persons`, data),
};

// services/api/compensation.ts
export const compensationAPI = {
  requestOTP: (personId: string, phone: string) =>
    apiClient.post(`/api/v1/persons/${personId}/family/request-otp`, { phone }),
  
  verifyOTP: (personId: string, phone: string, otp: string) =>
    apiClient.post(`/api/v1/persons/${personId}/family/verify-otp`, { phone, otp }),
  
  getStatus: (personId: string) =>
    apiClient.get(`/api/v1/persons/${personId}/compensation`),
};
```

## Authentication Service

```typescript
// services/auth/authService.ts
export class AuthService {
  // NEAR Wallet Login
  async loginWithNEAR() {
    const near = await connect(nearConfig);
    const wallet = new WalletConnection(near);
    await wallet.requestSignIn();
  }

  // JWT Token Management
  setToken(token: string) {
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('token_expiry', (Date.now() + 3600000).toString());
  }

  getToken(): string | null {
    const expiry = localStorage.getItem('token_expiry');
    if (expiry && Date.now() > parseInt(expiry)) {
      this.logout();
      return null;
    }
    return localStorage.getItem('jwt_token');
  }

  // Role Detection
  async detectRole(userId: string): Promise<UserRole> {
    const response = await apiClient.get(`/api/v1/users/${userId}/role`);
    return response.data.role;
  }

  logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('user_role');
  }
}
```

## Routing by Role

```typescript
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

export function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Victim Routes */}
        {user?.role === 'VICTIM' && (
          <Route path="/victim/*" element={<VictimLayout />}>
            <Route path="search" element={<PersonSearch />} />
            <Route path="family" element={<FamilyStatus />} />
            <Route path="compensation" element={<CompensationClaim />} />
          </Route>
        )}

        {/* Rescuer Routes */}
        {user?.role === 'RESCUER' && (
          <Route path="/rescuer/*" element={<RescuerLayout />}>
            <Route path="report" element={<ReportForm />} />
            <Route path="team" element={<TeamDashboard />} />
            <Route path="bundles" element={<BundleManager />} />
          </Route>
        )}

        {/* Medic Routes */}
        {user?.role === 'MEDIC' && (
          <Route path="/medic/*" element={<MedicLayout />}>
            <Route path="triage" element={<TriageQueue />} />
            <Route path="assessment/:id" element={<Assessment />} />
            <Route path="records" element={<PatientRecords />} />
          </Route>
        )}

        {/* Organization Routes */}
        {user?.role === 'ORG' && (
          <Route path="/org/*" element={<OrgLayout />}>
            <Route path="metrics" element={<OperationMetrics />} />
            <Route path="blockchain" element={<BlockchainStatus />} />
            <Route path="funds" element={<FundManagement />} />
            <Route path="audit" element={<AuditTrail />} />
          </Route>
        )}

        {/* Fallback */}
        <Route path="/" element={<Navigate to={`/${user?.role.toLowerCase()}`} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## Real-Time Features

### WebSocket Updates
```typescript
// For live notifications + real-time status updates
const ws = new WebSocket(
  `wss://api.disasternet.io/ws?token=${jwt_token}&role=${user.role}`
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Route to appropriate handler
  switch(data.type) {
    case 'person_found':
      notificationStore.addNotification({
        title: 'Person Found!',
        message: `${data.person.name} has been located`,
        type: 'success'
      });
      break;
      
    case 'compensation_unlocked':
      notificationStore.addNotification({
        title: 'Compensation Ready',
        message: `You can now claim compensation`,
        type: 'info'
      });
      break;
  }
};
```

## Deployment

### Development
```bash
npm install
npm run dev        # Vite dev server on :5173
```

### Production
```bash
npm run build      # Optimize bundle
npm run preview    # Preview build locally
vercel deploy      # Deploy to Vercel
```

### Environment Variables
```bash
VITE_API_URL=https://api.disasternet.io
VITE_NEAR_NETWORK=mainnet
VITE_NEAR_CONTRACT=disasternet.near
VITE_MAPBOX_TOKEN=pk_...
```

---

**Phase 5: Role-Based Dashboard UI System** provides a complete, production-ready frontend with:
- ✅ 4 role-specific dashboards
- ✅ Type-safe API integration
- ✅ JWT + NEAR authentication
- ✅ Real-time WebSocket updates
- ✅ Responsive UI with Tailwind
- ✅ Complete RBAC implementation
