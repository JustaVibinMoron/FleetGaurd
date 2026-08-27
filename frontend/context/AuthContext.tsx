"use client";

import {
  backendLogin,
  backendRegister,
  continueAsDemo,
  getStoredSession,
  restoreSessionFromToken,
  signIn,
  signOut,
  signUp,
  type StoredUser,
} from "@/lib/auth";
import type { User } from "@/lib/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (identifier: string, password: string, remember: boolean) => { ok: boolean; error?: string };
  register: (input: StoredUser, remember: boolean) => { ok: boolean; error?: string };
  demo: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setUser(stored);
      setReady(true);
      // Try to refresh from backend in background
      restoreSessionFromToken()
        .then((u) => {
          if (u) setUser(u);
        })
        .catch(() => {});
    } else {
      restoreSessionFromToken()
        .then((u) => {
          setUser(u);
          setReady(true);
        })
        .catch(() => {
          setReady(true);
        });
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      login: (identifier, password, remember) => {
        // Try real backend; fire-and-forget in background
        backendLogin(identifier, password, remember)
          .then((res) => {
            if (res.ok) setUser(res.user);
          })
          .catch(() => {});
        // Immediate synchronous fallback via legacy prototype auth
        const result = signIn(identifier, password, remember);
        if (result.ok) setUser(result.user);
        return result;
      },
      register: (input, remember) => {
        // Try real backend in background
        backendRegister(input, remember)
          .then((res) => {
            if (res.ok) setUser(res.user);
          })
          .catch(() => {});
        // Immediate synchronous fallback
        const result = signUp(input, remember);
        if (result.ok) setUser(result.user);
        return result;
      },
      demo: () => setUser(continueAsDemo()),
      logout: () => {
        signOut();
        setUser(null);
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
