import { NextResponse } from "next/server";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path.join("/"));
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path.join("/"));
}

async function forward(request: Request, path: string) {
  try {
    const response = await fetch(`${API}/api/auth/${path}`, {
      method: request.method,
      headers: { "content-type": "application/json", cookie: request.headers.get("cookie") ?? "" },
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
    });
    const headers = new Headers({ "content-type": "application/json" });
    const cookie = response.headers.get("set-cookie");
    if (cookie) headers.set("set-cookie", cookie);
    return new NextResponse(response.body, { status: response.status, headers });
  } catch {
    return NextResponse.json({ error: "api_offline" }, { status: 503 });
  }
}
