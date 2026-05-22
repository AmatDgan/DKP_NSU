// Защищает /dashboard и /admin маршруты через NextAuth (см. authorized callback в lib/auth.ts).
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
