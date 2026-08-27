"use client";

import { useState } from "react";
import { isValidEmail, minLength, type FieldErrors } from "@/lib/validation";
import { Eye, EyeOff } from "lucide-react";

export function SignInForm({
  onSubmit,
  onForgot,
  onCreate,
  error,
}: {
  onSubmit: (identifier: string, password: string, remember: boolean) => void;
  onForgot: () => void;
  onCreate: () => void;
  error?: string;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!identifier.trim()) next.identifier = "Email or company ID is required.";
    else if (identifier.includes("@") && !isValidEmail(identifier)) next.identifier = "Enter a valid email address.";
    if (!minLength(password, 8)) next.password = "Password must be at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit(identifier, password, remember);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="signin-id" className="mb-1 block text-sm font-medium text-ink">
          Email or company ID
        </label>
        <input
          id="signin-id"
          autoComplete="username"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          aria-invalid={Boolean(errors.identifier)}
        />
        {errors.identifier && <p className="mt-1 text-sm text-red-600">{errors.identifier}</p>}
      </div>
      <div>
        <label htmlFor="signin-password" className="mb-1 block text-sm font-medium text-ink">
          Password
        </label>
        <div className="relative">
          <input
            id="signin-password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pr-12 text-ink"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted"
            aria-label={show ? "Hide password" : "Show password"}
            onClick={() => setShow((s) => !s)}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-ink">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember Me
        </label>
        <button type="button" className="text-primary hover:underline" onClick={onForgot}>
          Forgot Password
        </button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      <button type="submit" className="w-full rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-800">
        Sign In
      </button>
      <p className="text-center text-sm text-muted">
        New to FleetGuard?{" "}
        <button type="button" className="font-medium text-primary hover:underline" onClick={onCreate}>
          Create Account
        </button>
      </p>
    </form>
  );
}
