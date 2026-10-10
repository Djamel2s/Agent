import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/chat", "/agents", "/workspace", "/activity", "/approvals", "/integrations", "/knowledge", "/memory", "/tasks"];

export function middleware(request: NextRequest) {
  const isProtected = PROTECTED_PATHS.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
  if (!isProtected || request.cookies.has("agent_session")) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|logo.png).*)"],
};
