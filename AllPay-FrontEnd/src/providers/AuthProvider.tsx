'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserToken } from '@/domain/auth/types/user-token.type';
import SessionExpiredAlert from '@/presenters/components/recaudadores/SessionExpiredAlert';

interface AuthContextType {
  session: any;
  sessionToken: UserToken | null;
  status: 'authenticated' | 'loading' | 'unauthenticated';
  isAuthenticated: boolean;
  isLoading: boolean;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  handleSessionExpired: () => Promise<void>;
  triggerSessionExpired: () => void;
  updateSession: (data: UserToken) => Promise<void>;
  getLoginUrl: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
      {auth.showSessionExpiredAlert && (
        <SessionExpiredAlert onClose={auth.handleSessionExpired} />
      )}
    </AuthContext.Provider>
  );
};

/**
 * Hook para acceder al contexto de autenticación desde cualquier componente
 * Este es el hook principal que debes usar en tus componentes
 */
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext debe ser usado dentro de un AuthProvider');
  }
  return context;
};

