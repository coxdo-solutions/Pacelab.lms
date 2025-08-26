'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export type Role = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  role: Role;
}

type Ctx = {
  user: (User & { token: string }) | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User & { token: string }>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<Ctx | undefined>(undefined);

type ProviderProps = {
  children: React.ReactNode;
  fetchUserOptions: {
    endpoint: string;        // `${process.env.NEXT_PUBLIC_API_URL}/auth/me`
    tokenStorageKey: string; // 'token'
  };
};

export function AuthProvider({ children, fetchUserOptions }: ProviderProps) {
  const { endpoint, tokenStorageKey } = fetchUserOptions;
  const [user, setUser] = useState<(User & { token: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Bootstrap from localStorage and verify with /auth/me
  useEffect(() => {
    let active = true;
    const init = async () => {
      const token = localStorage.getItem(tokenStorageKey);
      if (!token) { setLoading(false); return; }
      try {
        const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!res.ok) throw new Error('invalid');
        const me: User = await res.json();
        if (active) setUser({ ...me, token });
      } catch {
        localStorage.removeItem(tokenStorageKey);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    init();
    return () => { active = false; };
  }, [endpoint, tokenStorageKey]);

  const login = async (email: string, password: string) => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    if (!res.ok) {
      let msg = 'Login failed';
      try { msg = (await res.json()).message || msg; } catch {}
      throw new Error(msg);
    }
    // Expect either { access_token, user } or { token, ...user }
    const data = await res.json();
    const token: string = data.access_token ?? data.token;
    const me: User = data.user ?? {
      id: data.id, email: data.email, name: data.name, firstName: data.firstName, role: data.role,
    };
    localStorage.setItem(tokenStorageKey, token);
    const authUser = { ...me, token };
    setUser(authUser);
    return authUser;
  };

  const logout = async () => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    try { await fetch(`${API}/auth/logout`, { method: 'POST' }); } catch {}
    localStorage.removeItem(tokenStorageKey);
    setUser(null);
    router.replace('/login');
  };

  const value = useMemo<Ctx>(() => ({
    user, loading, login, logout, hasRole: (...roles) => !!user && roles.includes(user.role),
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

