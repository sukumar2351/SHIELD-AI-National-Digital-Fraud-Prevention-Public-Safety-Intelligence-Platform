import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  profile_picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: (id_token: string) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('shield_token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (e) {
      console.warn("Failed to fetch user, clearing token", e);
      setUser(null);
      localStorage.removeItem('shield_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let foundRavi = false;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          if (val && val.toLowerCase().includes('ravi')) {
            foundRavi = true;
          }
        }
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const val = sessionStorage.getItem(key);
          if (val && val.toLowerCase().includes('ravi')) {
            foundRavi = true;
          }
        }
      }
    } catch (e) {
      console.warn("Storage check failed", e);
    }

    if (foundRavi || localStorage.getItem('shield_username') === 'officer_shield' || !localStorage.getItem('shield_username')) {
      localStorage.setItem('shield_username', 'Sukumar');
      localStorage.setItem('shield_role', 'INVESTIGATOR');
      const profileObj = {
        name: "Sukumar",
        role: "OFFICER_SHIELD",
        designation: "INVESTIGATOR"
      };
      localStorage.setItem('shield_profile', JSON.stringify(profileObj));
      sessionStorage.setItem('shield_profile', JSON.stringify(profileObj));
    }

    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loginWithGoogle = async (id_token: string) => {
    setLoading(true);
    try {
      const data = await api.googleLogin(id_token);
      setToken(data.access_token);
      await fetchUser();
      return data;
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
