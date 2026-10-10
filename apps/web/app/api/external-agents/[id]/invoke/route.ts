import { NextResponse } from "next/server";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const token = process.env.AGENT_GATEWAY_TOKEN;
  if (!token) return NextResponse.json({ error: "gateway_not_configured" }, { status: 503 });
  const { id } = await context.params;
  try {
    const response = await fetch(`${API}/api/external-agents/${encodeURIComponent(id)}/invoke`, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json", "x-agent-gateway-token": token },
      body: await request.text(),
    });
    return new NextResponse(response.body, { status: response.status, headers: { "content-type": "application/json" } });
  } catch {
    return NextResponse.json({ error: "api_offline" }, { status: 503 });
  }
}
