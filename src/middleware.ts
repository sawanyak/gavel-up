import { NextResponse, type NextRequest } from "next/server";

// UX-only redirects based on cookie *presence*. Real authorization happens in every API route.
const PLAYER_COOKIE = "gu_player";
const STAFF_COOKIE = "gu_staff";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if ((pathname.startsWith("/gm") || pathname.startsWith("/tm")) && !req.cookies.get(STAFF_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/staff/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (pathname === "/play" && !req.cookies.get(PLAYER_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/play/register";
    url.search = search;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/play", "/gm/:path*", "/tm/:path*"],
};
