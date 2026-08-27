import { trucks } from "@/data/mock";

/**
 * Example REST shape for a future GPS / IoT backend.
 * Today it returns mock trucks. Later, query your database here.
 */
export async function GET() {
  return Response.json({ source: "mock", trucks });
}
