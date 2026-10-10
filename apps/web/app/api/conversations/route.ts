import { NextResponse } from "next/server";
const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
async function forward(request: Request) {
  const token = process.env.AGENT_GATEWAY_TOKEN;
  if (!token) return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  const url = new URL(request.url);
  try {
    const response = await fetch(`${API}/api/conversations${url.search}`, {
      method: request.method, cache: "no-store",
      headers: { "content-type": "application/json", "x-agent-gateway-token": token, cookie: request.headers.get("cookie") ?? "" },
      body: request.method === "GET" ? undefined : await request.text(),
    });
    return new NextResponse(response.body, { status: response.status, headers: { "content-type": "application/json" } });
  } catch { return NextResponse.json({ error: "api_offline" }, { status: 503 }); }
}
export async function GET(request: Request) { return forward(request); }
export async function POST(request: Request) { return forward(request); }
