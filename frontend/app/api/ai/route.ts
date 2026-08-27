/**
 * Future integration point for a real AI model.
 * Keep API keys on the server. Never put them in client components.
 *
 * Example later:
 * const key = process.env.OPENAI_API_KEY;
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return Response.json({
    ok: true,
    mode: "prototype",
    hint: "Replace this handler with OpenAI, Gemini, or another provider.",
    echo: body,
  });
}
