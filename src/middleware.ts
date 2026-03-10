import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "omniclip-super-secret-local-key-32-chars-long";
const encodedSecret = new TextEncoder().encode(JWT_SECRET_KEY);
const COOKIE_NAME = "omniclip_session";

// Routes that require authentication
const protectedRoutes = [
  "/setup",
  "/story",
  "/generate",
  "/result",
];

// API routes that require authentication
const protectedApiRoutes = [
  "/api/session",
  "/api/story",
  "/api/generation",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isProtectedApiRoute = protectedApiRoutes.some((route) => pathname.startsWith(route));

  // Skip middleware for public routes, auth routes, and static assets
  if (!isProtectedRoute && !isProtectedApiRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify token using jose (Edge runtime compatible)
    const { payload } = await jwtVerify(token, encodedSecret);
    
    // Pass user info to downstream headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId as string);
    requestHeaders.set("x-user-email", payload.email as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    // Invalid or expired token
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: "Unauthorized / Token Expired" }, { status: 401 });
    }
    
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    // Ignore static files and images
    "/((?!_next/static|_next/image|favicon.ico|images|mock-images|style-packs|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
