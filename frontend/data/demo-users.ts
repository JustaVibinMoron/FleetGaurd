import type { User } from "@/lib/types";

/**
 * Built-in demo accounts for the prototype.
 * Replace this file with a real auth provider later.
 */
export const DEMO_PASSWORD = "Admin@12345";

export const demoUsers: Array<User & { password: string }> = [
  {
    id: "user-demo-admin",
    email: "admin@fleetguard.com",
    fullName: "Admin User",
    companyName: "FleetGuard Logistics",
    phone: "+91 98765 00001",
    role: "Administrator",
    password: DEMO_PASSWORD,
  },
];
