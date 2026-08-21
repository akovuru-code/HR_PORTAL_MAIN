// Example authentication hook
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return JSON.parse(stored || "null");
  });

  // Sync user state to localStorage and across tabs
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, [user]);

  // Listen for changes in localStorage from other tabs
  useEffect(() => {
    const syncUser = (e) => {
      if (e.key === 'user') {
        if (e.newValue) {
          setUser(JSON.parse(e.newValue));
        } else {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  // Helper: normalized role
  const normalizedRole = user?.role ? user.role.toLowerCase() : undefined;

  const clearOnboardingKeys = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('submitted_') || k.startsWith('canEdit_') || k === 'onboardingSubmitted')
      .forEach(k => localStorage.removeItem(k));
  };

  const login = (userData, token) => {
    clearOnboardingKeys();
    setUser(userData);
    if (token) localStorage.setItem('token', token);
  };
  const logout = () => {
    clearOnboardingKeys();
    setUser(null);
  };
  return { user, login, logout, normalizedRole };
}
