import { NextResponse } from "next/server";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function proxy(path: string, init?: RequestInit): Promise<NextResponse> {
  const token = process.env.AGENT_GATEWAY_TOKEN;
  if (!token) return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  try {
    const response = await fetch(`${API}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "content-type": "application/json", "x-agent-gateway-token": token, ...(init?.headers ?? {}) },
    });
    return new NextResponse(response.body, { status: response.status, headers: { "content-type": "application/json" } });
  } catch {
    return NextResponse.json({ error: "api_offline" }, { status: 503 });
  }
}

export async function GET(): Promise<NextResponse> {
  return proxy("/api/external-agents");
}

export async function POST(request: Request): Promise<NextResponse> {
  return proxy("/api/external-agents", { method: "POST", body: await request.text() });
}
