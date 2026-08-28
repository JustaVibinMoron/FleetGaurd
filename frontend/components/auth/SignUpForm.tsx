"use client";

import { useState } from "react";
import { isValidEmail, minLength, passwordsMatch, type FieldErrors } from "@/lib/validation";
import { Eye, EyeOff } from "lucide-react";

const ROLES = ["Fleet Operations", "Dispatcher", "Company Admin", "Partner Coordinator", "Driver Lead"];

export function SignUpForm({
  onSubmit,
  onSignIn,
  error,
  loading,
}: {
  onSubmit: (values: {
    companyName: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: string;
  }) => void;
  onSignIn: () => void;
  error?: string;
  loading?: boolean;
}) {
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [terms, setTerms] = useState(false);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!companyName.trim()) next.companyName = "Company name is required.";
    if (!fullName.trim()) next.fullName = "Full name is required.";
    if (!isValidEmail(email)) next.email = "Enter a valid email address.";
    if (!phone.trim()) next.phone = "Phone number is required.";
    if (!minLength(password, 8)) next.password = "Password must be at least 8 characters.";
    if (!passwordsMatch(password, confirm)) next.confirm = "Passwords do not match.";
    if (!terms) next.terms = "You must accept the terms and conditions.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({ companyName, fullName, email, phone, password, role });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <Field id="company" label="Company name" value={companyName} onChange={setCompanyName} error={errors.companyName} />
      <Field id="fullname" label="Full name" value={fullName} onChange={setFullName} error={errors.fullName} />
      <Field id="email" label="Email" type="email" value={email} onChange={setEmail} error={errors.email} />
      <Field id="phone" label="Phone number" value={phone} onChange={setPhone} error={errors.phone} />
      <div>
        <label htmlFor="role" className="mb-1 block text-sm font-medium text-ink">
          Company type or role
        </label>
        <select
          id="role"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-ink">
          Password
        </label>
        <div className="relative">
          <input
            id="signup-password"
            type={show ? "text" : "password"}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 pr-12 text-ink"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted" aria-label="Toggle password visibility" onClick={() => setShow((s) => !s)}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
      </div>
      <Field id="confirm" label="Confirm password" type={show ? "text" : "password"} value={confirm} onChange={setConfirm} error={errors.confirm} />
      <label className="flex items-start gap-2 text-sm text-ink">
        <input className="mt-1" type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        I accept the terms and conditions for using FleetGuard logistics data.
      </label>
      {errors.terms && <p className="text-sm text-red-600">{errors.terms}</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40">{error}</p>}
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? "Creating account…" : "Create Account"}
      </button>
      <p className="text-center text-sm text-muted">
        Already have access?{" "}
        <button type="button" className="font-medium text-primary hover:underline" onClick={onSignIn}>
          Sign In
        </button>
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
