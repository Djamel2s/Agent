import { NextResponse } from "next/server";
const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = process.env.AGENT_GATEWAY_TOKEN;
  if (!token) return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  const { id } = await context.params;
  try {
    const response = await fetch(`${API}/api/conversations/${encodeURIComponent(id)}${new URL(request.url).search}`, { cache: "no-store", headers: { "x-agent-gateway-token": token, cookie: request.headers.get("cookie") ?? "" } });
    return new NextResponse(response.body, { status: response.status, headers: { "content-type": "application/json" } });
  } catch { return NextResponse.json({ error: "api_offline" }, { status: 503 }); }
}
