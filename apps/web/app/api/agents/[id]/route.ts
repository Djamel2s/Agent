import { NextResponse } from "next/server";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function forward(request: Request, id: string): Promise<NextResponse> {
  const token = process.env.AGENT_GATEWAY_TOKEN;
  if (!token) return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  try {
    const response = await fetch(`${API}/api/agents/${encodeURIComponent(id)}`, {
      method: request.method,
      cache: "no-store",
      headers: request.method === "DELETE"
        ? { "x-agent-gateway-token": token, cookie: request.headers.get("cookie") ?? "" }
        : { "content-type": "application/json", "x-agent-gateway-token": token, cookie: request.headers.get("cookie") ?? "" },
      body: request.method === "DELETE" ? undefined : await request.text(),
    });
    return new NextResponse(response.body, { status: response.status, headers: { "content-type": "application/json" } });
  } catch {
    return NextResponse.json({ error: "api_offline" }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return forward(request, (await context.params).id);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return forward(request, (await context.params).id);
}
