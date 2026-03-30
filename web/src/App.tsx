import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/auth/authContext';
import { ToastProvider } from './components/common/ToastProvider';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Login } from './pages/Login';
import { VictimHome } from './pages/VictimHome';
import { RescuerHome } from './pages/RescuerHome';
import { MedicHome } from './pages/MedicHome';
import { OrgHome } from './pages/OrgHome';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<Login />} />

              {/* Victim Routes */}
              <Route
                path="/victim/*"
                element={
                  <ProtectedRoute allowedRoles={['VICTIM']}>
                    <VictimHome />
                  </ProtectedRoute>
                }
              />

              {/* Rescuer Routes */}
              <Route
                path="/rescuer/*"
                element={
                  <ProtectedRoute allowedRoles={['RESCUER']}>
                    <RescuerHome />
                  </ProtectedRoute>
                }
              />

              {/* Medic Routes */}
              <Route
                path="/medic/*"
                element={
                  <ProtectedRoute allowedRoles={['MEDIC']}>
                    <MedicHome />
                  </ProtectedRoute>
                }
              />

              {/* Organization Routes */}
              <Route
                path="/org/*"
                element={
                  <ProtectedRoute allowedRoles={['ORG']}>
                    <OrgHome />
                  </ProtectedRoute>
                }
              />

              {/* Default Route */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

export default App;
