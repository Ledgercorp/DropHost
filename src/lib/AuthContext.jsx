import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    base44.auth
      .isAuthenticated()
      .then(async (authed) => {
        if (!active) return;
        setIsAuthenticated(authed);
        if (authed) {
          try {
            const me = await base44.auth.me();
            if (active) setUser(me);
          } catch (e) {
            if (active) setAuthError(e);
          }
        }
        if (active) setIsLoadingAuth(false);
      })
      .catch(() => {
        if (!active) return;
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoadingAuth, authError, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};