import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  loginWithEmail,
  registerWithEmail,
  verifyGoogleCredential,
  fetchCurrentUser,
} from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pccis_token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pccis_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Validate existing session on mount
  useEffect(() => {
    let isMounted = true;
    async function validateSession() {
      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }
      try {
        const userData = await fetchCurrentUser();
        if (isMounted) {
          setUser(userData);
          localStorage.setItem('pccis_user', JSON.stringify(userData));
        }
      } catch (err) {
        // Token expired or invalid
        console.warn('Authentication token expired or backend unreachable:', err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    validateSession();
    return () => { isMounted = false; };
  }, [token]);

  const saveAuthSession = (authResponse) => {
    const receivedToken = authResponse.access_token || authResponse.token;
    const receivedUser = authResponse.user || {
      name: authResponse.name || 'Inspector',
      email: authResponse.email,
      role: authResponse.role || 'Inspector',
    };

    if (receivedToken) {
      setToken(receivedToken);
      localStorage.setItem('pccis_token', receivedToken);
    }
    setUser(receivedUser);
    localStorage.setItem('pccis_user', JSON.stringify(receivedUser));
  };

  const login = async (email, password) => {
    const data = await loginWithEmail(email, password);
    saveAuthSession(data);
    return data;
  };

  const signup = async (name, email, password) => {
    const data = await registerWithEmail(name, email, password);
    saveAuthSession(data);
    return data;
  };

  const loginWithGoogle = async (credential) => {
    const data = await verifyGoogleCredential(credential);
    saveAuthSession(data);
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('pccis_token');
    localStorage.removeItem('pccis_user');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
