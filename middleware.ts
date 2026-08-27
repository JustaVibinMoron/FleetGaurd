/**
 * Future real-route protection.
 * When using NextAuth/Supabase, check the session cookie here
 * and redirect unauthenticated users to `/`.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
