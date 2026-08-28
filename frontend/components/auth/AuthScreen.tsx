"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { useAuth } from "@/context/AuthContext";
import { DEMO_PASSWORD } from "@/data/demo-users";
import { healthApi } from "@/lib/api";

type Mode = "menu" | "signin" | "signup" | "forgot";

export function AuthScreen() {
  const { login, register, demo } = useAuth();
  const [mode, setMode] = useState<Mode>("menu");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    healthApi
      .check()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-950 via-blue-800 to-indigo-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <Logo />
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-blue-200">Control center</p>
            <h1 className="mt-3 max-w-md text-4xl font-semibold leading-tight">
              Smart Truck Tracking & Emergency Logistics
            </h1>
            <p className="mt-4 max-w-md text-blue-100">
              Monitor load capacity, reroute emergencies, and request partner trucks from one operations desk.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-blue-100">
            <li>Live fleet map and overload alerts</li>
            <li>OSRM-powered route engine</li>
            <li>Partner replacement network</li>
          </ul>
        </section>

        <section className="flex flex-col px-5 py-6 sm:px-10">
          <div className="mb-8 flex items-center justify-between">
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
          <div className="mx-auto w-full max-w-md flex-1">
            <div className="mb-4 flex items-center gap-2">
              <p className="text-sm text-muted">FleetGuard Logistics</p>
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  backendOk === null
                    ? "bg-yellow-400 animate-pulse"
                    : backendOk
                      ? "bg-emerald-500"
                      : "bg-red-500"
                }`}
                title={backendOk === null ? "Checking…" : backendOk ? "Backend connected" : "Backend offline — using demo data"}
              />
            </div>
            <h2 className="mb-6 text-2xl font-semibold text-ink">
              {mode === "menu" && "Sign in to the operations desk"}
              {mode === "signin" && "Sign In"}
              {mode === "signup" && "Create Account"}
              {mode === "forgot" && "Forgot Password"}
            </h2>

            {mode === "menu" && (
              <div className="space-y-3">
                <p className="text-sm text-muted">Smart Truck Tracking & Emergency Logistics</p>
                <button className="w-full rounded-xl bg-blue-700 py-3 font-semibold text-white hover:bg-blue-800" onClick={() => setMode("signin")}>
                  Sign In
                </button>
                <button className="w-full rounded-xl border border-line py-3 font-semibold text-ink hover:bg-surface-2" onClick={() => setMode("signup")}>
                  Create Account
                </button>
                <button className="w-full rounded-xl bg-surface-2 py-3 font-medium text-ink" onClick={demo}>
                  Continue as Demo User
                </button>
                <div className="flex items-center justify-between pt-2 text-sm">
                  <button className="text-primary hover:underline" onClick={() => setMode("forgot")}>
                    Forgot Password
                  </button>
                  <span className="text-muted">Remember Me on sign-in</span>
                </div>
                <p className="rounded-xl border border-line bg-surface p-3 text-xs text-muted">
                  Demo login: <strong>admin@fleetguard.com</strong> / <strong>{DEMO_PASSWORD}</strong>
                  {backendOk === false && (
                    <span className="block mt-1 text-amber-600">
                      ⚠ Backend offline — sign-in uses local demo data.
                    </span>
                  )}
                  {backendOk === true && (
                    <span className="block mt-1 text-emerald-600">
                      ✅ Backend connected — sign-in uses FastAPI auth.
                    </span>
                  )}
                </p>
              </div>
            )}

            {mode === "signin" && (
              <SignInForm
                error={error}
                loading={loading}
                onForgot={() => setMode("forgot")}
                onCreate={() => {
                  setError("");
                  setMode("signup");
                }}
                onSubmit={async (id, password, remember) => {
                  setLoading(true);
                  setError("");
                  try {
                    const result = await login(id, password, remember);
                    setError(result.ok ? "" : result.error ?? "Unable to sign in.");
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            )}

            {mode === "signup" && (
              <SignUpForm
                error={error}
                loading={loading}
                onSignIn={() => {
                  setError("");
                  setMode("signin");
                }}
                onSubmit={async (values) => {
                  setLoading(true);
                  setError("");
                  try {
                    const result = await register(
                      {
                        id: `user-${Date.now()}`,
                        ...values,
                      },
                      true,
                    );
                    setError(result.ok ? "" : result.error ?? "Unable to create account.");
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            )}

            {mode === "forgot" && <ForgotPasswordForm onBack={() => setMode("signin")} />}
          </div>
        </section>
      </div>
    </div>
  );
}
