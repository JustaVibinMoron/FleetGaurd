import type { User } from "@/lib/types";

/**
 * Built-in demo accounts for the prototype.
 * Replace this file with a real auth provider later.
 */
export const DEMO_PASSWORD = "Demo@1234";

export const demoUsers: Array<User & { password: string }> = [
  {
    id: "user-demo-ops",
    email: "ops@fleetguard.com",
    fullName: "Priya Sen",
    companyName: "FleetGuard Logistics",
    phone: "+91 98765 00001",
    role: "Fleet Operations Manager",
    password: DEMO_PASSWORD,
  },
  {
    id: "user-demo-admin",
    email: "admin@fleetguard.com",
    fullName: "Arjun Mehta",
    companyName: "FleetGuard Logistics",
    phone: "+91 98765 00002",
    role: "Administrator",
    password: DEMO_PASSWORD,
  },
];
