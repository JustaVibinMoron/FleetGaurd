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
import { healthApi } from "@/lib/api";
import type { User } from "@/lib/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (identifier: string, password: string, remember: boolean) => Promise<{ ok: boolean; error?: string }>;
  register: (input: StoredUser, remember: boolean) => Promise<{ ok: boolean; error?: string }>;
  demo: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Track whether a fresh backend login just happened so the background
  // restoreSessionFromToken() doesn't race and clear the JWT we just stored.
  const [freshLogin, setFreshLogin] = useState(false);

  useEffect(() => {
    // After a fresh login the JWT and session are already stored — skip the
    // background restore which could clear them if the old stored token was
    // invalid.
    if (freshLogin) {
      setFreshLogin(false);
      return;
    }

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
  }, [freshLogin]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      login: async (identifier, password, remember) => {
        // Check whether the backend is reachable before choosing a strategy.
        let backendAvailable = false;
        try {
          await healthApi.check();
          backendAvailable = true;
        } catch {
          // Backend unreachable
        }

        if (backendAvailable) {
          // Backend is reachable — use ONLY backend auth. Never fall back to
          // legacy/demo auth which would silently succeed without a JWT.
          try {
            const res = await backendLogin(identifier, password, remember);
            if (res.ok) {
              setFreshLogin(true);
              setUser(res.user);
              return { ok: true };
            }
            return { ok: false, error: res.error };
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Backend login failed.";
            return { ok: false, error: message };
          }
        }

        // Backend unreachable — fall back to local demo/prototype auth
        const result = signIn(identifier, password, remember);
        if (result.ok) setUser(result.user);
        return result;
      },
      register: async (input, remember) => {
        let backendAvailable = false;
        try {
          await healthApi.check();
          backendAvailable = true;
        } catch {
          // Backend unreachable
        }

        if (backendAvailable) {
          try {
            const res = await backendRegister(input, remember);
            if (res.ok) {
              setFreshLogin(true);
              setUser(res.user);
              return { ok: true };
            }
            return { ok: false, error: res.error };
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Backend registration failed.";
            return { ok: false, error: message };
          }
        }

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
