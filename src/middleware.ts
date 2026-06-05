// Защищает /dashboard и /admin маршруты (см. колбэк authorized в auth.config.ts).
// middleware работает в Edge-runtime, поэтому подключаем ТОЛЬКО authConfig
// (без prisma/bcrypt), иначе сборка падает на node:os / UnhandledSchemeError.
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
