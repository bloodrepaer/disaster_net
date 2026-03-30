#!/usr/bin/env node

/**
 * Phase 5 Feature Verification Script
 * Checks if all required components and features are present
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = __dirname;

// Define required files and their descriptions
const REQUIRED_FILES = {
  // Configuration
  'package.json': 'npm configuration with dependencies',
  'vite.config.ts': 'Vite build configuration',
  'tsconfig.json': 'TypeScript configuration',
  'tailwind.config.js': 'Tailwind CSS configuration',
  'postcss.config.js': 'PostCSS configuration',
  'index.html': 'HTML entry point',
  '.env.example': 'Environment variables template',
  
  // Source files
  'src/main.tsx': 'Application bootstrap',
  'src/App.tsx': 'Main router component',
  'src/index.css': 'Global styles',
  'src/types/index.ts': 'TypeScript type definitions',
  
  // Services
  'src/services/api/client.ts': 'Axios HTTP client',
  'src/services/api/persons.ts': 'Person service',
  'src/services/api/bundles.ts': 'Bundle service',
  'src/services/api/compensation.ts': 'Compensation service',
  'src/services/api/medical.ts': 'Medical service',
  'src/services/api/operations.ts': 'Operations service',
  'src/services/api/index.ts': 'API services index',
  
  'src/services/auth/authService.ts': 'Authentication service',
  'src/services/auth/authContext.tsx': 'Authentication context provider',
  
  // Components
  'src/components/common/ProtectedRoute.tsx': 'Route protection component',
  'src/components/common/LoadingSpinner.tsx': 'Loading spinner component',
  'src/pages/Login.tsx': 'Login page',
  
  // Dashboards
  'src/pages/VictimHome.tsx': 'Victim dashboard',
  'src/pages/RescuerHome.tsx': 'Rescuer dashboard',
  'src/pages/MedicHome.tsx': 'Medic dashboard',
  'src/pages/OrgHome.tsx': 'Organization dashboard',
  'src/pages/NotFound.tsx': '404 page',
  
  // Documentation
  'README_PHASE5.md': 'Phase 5 documentation',
  'QUICKSTART.md': 'Quick start guide',
};

// Features to check in files
const FEATURES_TO_CHECK = {
  'src/types/index.ts': [
    'UserRole',
    'User',
    'Person',
    'Compensation',
    'MedicalAssessment',
    'Bundle',
    'Notification'
  ],
  'src/services/api/persons.ts': [
    'search',
    'getById',
    'create',
    'updateStatus',
    'addConfirmation'
  ],
  'src/services/api/bundles.ts': [
    'submit',
    'getById',
    'getStatus',
    'anchor'
  ],
  'src/services/api/compensation.ts': [
    'requestOTP',
    'verifyOTP',
    'getStatus',
    'getActiveClaims'
  ],
  'src/services/api/medical.ts': [
    'getTriageQueue',
    'submitAssessment',
    'issueClearance',
    'getPatientRecords'
  ],
  'src/services/api/operations.ts': [
    'getMetrics',
    'getBlockchainStatus',
    'getFundingStatus',
    'getVolunteerStats'
  ],
  'src/services/auth/authService.ts': [
    'login',
    'loginWithNEAR',
    'verifyToken',
    'createApiClient'
  ],
  'src/services/auth/authContext.tsx': [
    'AuthProvider',
    'useAuthContext',
    'AuthContextType'
  ],
  'src/App.tsx': [
    'VictimHome',
    'RescuerHome',
    'MedicHome',
    'OrgHome',
    'ProtectedRoute'
  ],
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  const fullPath = path.join(webDir, filePath);
  return fs.existsSync(fullPath);
}

function checkFeatureInFile(filePath, features) {
  const fullPath = path.join(webDir, filePath);
  if (!fs.existsSync(fullPath)) {
    return { found: [], missing: features };
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const found = [];
  const missing = [];
  
  features.forEach(feature => {
    if (content.includes(feature)) {
      found.push(feature);
    } else {
      missing.push(feature);
    }
  });
  
  return { found, missing };
}

function runChecks() {
  log('\n🔍 PHASE 5 FEATURE VERIFICATION\n', 'bright');
  
  let totalPassed = 0;
  let totalFailed = 0;
  const missingFiles = [];
  const missingFeatures = [];
  
  // Check required files
  log('📁 Checking Required Files:', 'blue');
  Object.entries(REQUIRED_FILES).forEach(([file, description]) => {
    const exists = checkFileExists(file);
    if (exists) {
      log(`  ✅ ${file} - ${description}`, 'green');
      totalPassed++;
    } else {
      log(`  ❌ ${file} - ${description}`, 'red');
      totalFailed++;
      missingFiles.push(file);
    }
  });
  
  // Check features in files
  log('\n🔧 Checking Features in Files:', 'blue');
  Object.entries(FEATURES_TO_CHECK).forEach(([filePath, features]) => {
    const result = checkFeatureInFile(filePath, features);
    if (result.missing.length === 0) {
      log(`  ✅ ${filePath}`, 'green');
      log(`     All features found: ${result.found.join(', ')}`, 'green');
      totalPassed++;
    } else {
      log(`  ⚠️  ${filePath}`, 'yellow');
      log(`     Found: ${result.found.join(', ')}`, 'green');
      if (result.missing.length > 0) {
        log(`     Missing: ${result.missing.join(', ')}`, 'red');
        totalFailed++;
        missingFeatures.push({ file: filePath, missing: result.missing });
      }
    }
  });
  
  // Summary
  log('\n📊 SUMMARY\n', 'bright');
  log(`Total Checks Passed: ${totalPassed}`, 'green');
  log(`Total Checks Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
  
  if (missingFiles.length > 0) {
    log('\n❌ Missing Files:', 'red');
    missingFiles.forEach(file => log(`  - ${file}`, 'red'));
  }
  
  if (missingFeatures.length > 0) {
    log('\n❌ Missing Features:', 'red');
    missingFeatures.forEach(({ file, missing }) => {
      log(`  - ${file}: ${missing.join(', ')}`, 'red');
    });
  }
  
  if (missingFiles.length === 0 && missingFeatures.length === 0) {
    log('\n✅ ALL PHASE 5 FEATURES ARE PRESENT!\n', 'green');
    log('Status: READY FOR TESTING', 'bright');
    return true;
  } else {
    log('\n⚠️  SOME FEATURES ARE MISSING\n', 'yellow');
    log('Status: NEEDS COMPLETION', 'bright');
    return false;
  }
}

// Run the verification
const allPresent = runChecks();
process.exit(allPresent ? 0 : 1);
