import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH, LOGIN_PATH, NEXT_PARAM, PROTECTED_PATHS, SESSION_COOKIE } from "@/lib/auth/constants";
import { safeNextPath } from "@/lib/auth/next-path";

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const { pathname, search, searchParams } = request.nextUrl;

  if (pathname === LOGIN_PATH && hasSession) {
    const next = safeNextPath(searchParams.get(NEXT_PARAM)) ?? HOME_PATH;
    return NextResponse.redirect(new URL(next, request.url));
  }
  const isProtected = PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (isProtected && !hasSession) {
    const login = new URL(LOGIN_PATH, request.url);
    if (pathname !== HOME_PATH) login.searchParams.set(NEXT_PARAM, `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/inicio/:path*", "/cadastro/:path*", "/perfil/:path*", "/alunos/:path*", "/assuntos/:path*", "/exercicios/:path*", "/planos/:path*", "/convite/:path*"],
};
