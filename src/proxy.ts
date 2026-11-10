import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "b2b_session";

/** Pages a guest may open. Everything else on the platform requires an approved account. */
const PUBLIC = ["/login", "/register", "/terms", "/privacy", "/admin/login"];

/**
 * Optimistic redirect for guests (the platform is closed). This is only a UX shortcut —
 * real authorization happens in layouts, pages, actions and route handlers on the server.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC.some((p) => path === p || path.startsWith(`${p}/`))) return NextResponse.next();
  if (!request.cookies.has(SESSION_COOKIE)) {
    // Admin area: show the admin sign-in form right at the requested URL (no redirect)
    if (path === "/admin" || path.startsWith("/admin/")) return NextResponse.rewrite(new URL("/admin/login", request.url));
    if (path.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = new URL("/login", request.url);
    if (path !== "/") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files (fonts, images, icons).
  matcher: ["/((?!_next/|fonts/|images/|icon|favicon|robots.txt|sitemap.xml).*)"],
};
