import { demoUsers } from "@/data/demo-users";
import { authApi, storeToken, clearToken, getStoredToken } from "@/lib/api";
import { readJson, removeKey, writeJson } from "@/lib/storage";
import type { User } from "@/lib/types";

/**
 * Authentication layer.
 * Tries the real FastAPI backend first; falls back to prototype localStorage
 * / demo users when the backend is unreachable.
 */

const SESSION_KEY = "fleetguard.session";
const USERS_KEY = "fleetguard.users";

export type StoredUser = User & { password: string };

const DEMO_USER: User = {
  id: "user-demo-guest",
  email: "demo@fleetguard.com",
  fullName: "Demo Dispatcher",
  companyName: "FleetGuard Logistics",
  role: "Demo User",
};

function registeredUsers(): StoredUser[] {
  return readJson<StoredUser[]>(USERS_KEY, []);
}

export function getStoredSession(): User | null {
  if (typeof window === "undefined") return null;
  const local = window.localStorage.getItem(SESSION_KEY);
  const session = window.sessionStorage.getItem(SESSION_KEY);
  const raw = local ?? session;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function persistSession(user: User, remember: boolean) {
  const payload = JSON.stringify(user);
  if (remember) {
    window.localStorage.setItem(SESSION_KEY, payload);
    window.sessionStorage.removeItem(SESSION_KEY);
  } else {
    window.sessionStorage.setItem(SESSION_KEY, payload);
    window.localStorage.removeItem(SESSION_KEY);
  }
}

/** Attempt to restore session from a stored JWT by calling GET /api/auth/me.
 *
 * NOTE: We do NOT clear the token on failure. If the JWT was just stored by a
 * fresh login, clearing it here would race with FleetContext API calls.
 */
export async function restoreSessionFromToken(): Promise<User | null> {
  const jwt = getStoredToken();
  if (!jwt) return null;
  try {
    const me = await authApi.me();
    const user: User = {
      id: `user-${me.userId}`,
      email: me.email,
      fullName: me.fullName,
      companyName: "FleetGuard Logistics",
      role: me.role,
    };
    persistSession(user, true);
    return user;
  } catch {
    // Do NOT clear token here — it may have just been stored by a fresh
    // login. Instead, return null so the caller knows restoration failed.
    return null;
  }
}

/**
 * Sign in with the real backend.
 * Returns a User on success; null plus error message on failure.
 */
export async function backendLogin(
  email: string,
  password: string,
  remember: boolean,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  try {
    const tokenData = await authApi.login(email, password);
    storeToken(tokenData.accessToken);
    const user: User = {
      id: `user-${tokenData.userId}`,
      email,
      fullName: email.split("@")[0],
      companyName: "FleetGuard Logistics",
      role: tokenData.role,
    };
    persistSession(user, remember);
    return { ok: true, user };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to sign in.";
    return { ok: false, error: message };
  }
}

/**
 * Register with the real backend.
 */
export async function backendRegister(
  input: StoredUser,
  remember: boolean,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  try {
    const me = await authApi.register({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
    });
    // Auto-login after successful registration
    const loginResult = await backendLogin(input.email, input.password, remember);
    if (loginResult.ok) return loginResult;
    // Fallback: use the returned user data directly
    const user: User = {
      id: `user-${me.userId}`,
      email: me.email,
      fullName: me.fullName,
      companyName: "FleetGuard Logistics",
      role: me.role,
    };
    persistSession(user, remember);
    return { ok: true, user };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unable to create account.";
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Legacy prototype functions (kept for demo/offline fallback)
// ---------------------------------------------------------------------------

export function signIn(identifier: string, password: string, remember: boolean) {
  const id = identifier.trim().toLowerCase();
  const demo = demoUsers.find(
    (u) => u.email.toLowerCase() === id || u.id.toLowerCase() === id,
  );
  if (demo && demo.password === password) {
    const { password: _pw, ...user } = demo;
    persistSession(user, remember);
    return { ok: true as const, user };
  }

  const local = registeredUsers().find(
    (u) => u.email.toLowerCase() === id || u.companyName.toLowerCase() === id,
  );
  if (local && local.password === password) {
    const { password: _pw, ...user } = local;
    persistSession(user, remember);
    return { ok: true as const, user };
  }

  return { ok: false as const, error: "Invalid email/company ID or password." };
}

export function signUp(input: StoredUser, remember: boolean) {
  const users = registeredUsers();
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false as const, error: "An account with this email already exists." };
  }
  if (demoUsers.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false as const, error: "This demo email is reserved. Choose another email." };
  }
  writeJson(USERS_KEY, [...users, input]);
  const { password: _pw, ...user } = input;
  persistSession(user, remember);
  return { ok: true as const, user };
}

export function continueAsDemo() {
  persistSession(DEMO_USER, false);
  return DEMO_USER;
}

export function signOut() {
  clearToken();
  removeKey(SESSION_KEY);
}

export { DEMO_USER };
