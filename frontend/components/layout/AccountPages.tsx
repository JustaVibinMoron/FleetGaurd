"use client";

import { useAuth } from "@/context/AuthContext";

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <section className="card max-w-xl space-y-2 p-5">
      <h2 className="text-lg font-semibold">Profile</h2>
      <p><strong>Name:</strong> {user.fullName}</p>
      <p><strong>Company:</strong> {user.companyName}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Role:</strong> {user.role}</p>
      {user.phone && <p><strong>Phone:</strong> {user.phone}</p>}
    </section>
  );
}

export function SettingsPage() {
  return (
    <section className="card max-w-xl space-y-3 p-5">
      <h2 className="text-lg font-semibold">Account Settings</h2>
      <p className="text-sm text-muted">
        Prototype settings. Connect this screen to NextAuth, Firebase, or Supabase when you add a real backend.
      </p>
      <label className="block text-sm">
        Notification email
        <input className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2" defaultValue="ops@fleetguard.com" />
      </label>
      <button type="button" className="rounded-xl bg-blue-700 px-4 py-2 text-white">
        Save (local only)
      </button>
    </section>
  );
}
