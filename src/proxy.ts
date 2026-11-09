import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "b2b_session";

/**
 * Optimistic redirect for guests hitting protected areas. This is only a UX shortcut —
 * real authorization happens in layouts, pages, actions and route handlers on the server.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/admin/login") return NextResponse.next();
  if (!request.cookies.has(SESSION_COOKIE)) {
    if (path === "/admin" || path.startsWith("/admin/")) return NextResponse.redirect(new URL("/admin/login", request.url));
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/company/:path*", "/admin", "/admin/:path*"],
};
