/**
 * Future authentication API.
 * Swap the client lib/auth.ts helpers to call this route, then
 * replace this handler with NextAuth, Firebase Admin, or Supabase.
 */
export async function POST() {
  return Response.json({
    ok: false,
    message: "Prototype uses localStorage auth. Connect a real provider here.",
  });
}
