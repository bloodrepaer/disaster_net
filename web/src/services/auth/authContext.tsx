import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../../types/user';
import { authService } from './authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (nearId: string, password: string) => Promise<void>;
  loginWithNEAR: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('jwt_token');
        if (token) {
          const userData = await authService.verifyToken(token);
          setUser(userData);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (nearId: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const userData = await authService.login(nearId, password);
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithNEAR = async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await authService.loginWithNEAR();
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'NEAR login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        loginWithNEAR,
        logout,
        isAuthenticated: !!user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
