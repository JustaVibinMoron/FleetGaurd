"use client";

import { useState } from "react";
import { isValidEmail } from "@/lib/validation";

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValidEmail(email)) {
          setError("Enter a valid email address.");
          return;
        }
        setError("");
        setSent(true);
      }}
    >
      <p className="text-sm text-muted">
        Password reset is simulated in this prototype. A real provider can hook into <code>/api/auth</code> later.
      </p>
      <div>
        <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-ink">
          Account email
        </label>
        <input
          id="reset-email"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      {sent && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Reset link simulated. Check this inbox in a production app.</p>}
      <button type="submit" className="w-full rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white">
        Send reset link
      </button>
      <button type="button" className="w-full text-sm text-primary hover:underline" onClick={onBack}>
        Back to Sign In
      </button>
    </form>
  );
}
