import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types';
import * as api from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  networkError: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retryConnection: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Check if error is a network/connection error vs authentication error
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  if (error instanceof Error && error.message.includes('NetworkError')) {
    return true;
  }
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    setNetworkError(false);

    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      if (isNetworkError(error)) {
        // Network error - don't clear user state, show error
        setNetworkError(true);
      } else {
        // Auth error (401) - user is not logged in
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string) => {
    setNetworkError(false);
    const loggedInUser = await api.login(username, password);
    setUser(loggedInUser);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors - clear state anyway
    }
    setUser(null);
  };

  const retryConnection = () => {
    checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, networkError, login, logout, retryConnection }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
