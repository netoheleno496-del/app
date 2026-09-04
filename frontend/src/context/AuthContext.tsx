import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, TOKEN_KEY } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await storage.secureGet<string>(TOKEN_KEY, "");
      if (token) {
        try {
          const me = await api<User>("/auth/me");
          setUser(me);
        } catch {
          await storage.secureRemove(TOKEN_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
    await storage.secureSet(TOKEN_KEY, res.access_token);
    setUser(res.user);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const res = await api<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      auth: false,
      body: { name, email, password },
    });
    await storage.secureSet(TOKEN_KEY, res.access_token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
