import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../services/auth/authContext';
import { UserRole } from '../../types';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuthContext();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
