import type { NextAuthConfig } from "next-auth";
import { type DefaultSession } from "next-auth";

// ВНИМАНИЕ: этот файл подключается из middleware (Edge-runtime), поэтому в нём
// НЕЛЬЗЯ импортировать prisma, bcrypt и прочий Node-код — иначе сборка падает
// с ошибкой про node:os / UnhandledSchemeError. Здесь только конфиг и колбэки,
// которым не нужна база. Сам провайдер Credentials (с обращением к базе)
// добавляется в auth.ts, который выполняется только в Node-runtime.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "USER";
    } & DefaultSession["user"];
  }
  interface User {
    role: "ADMIN" | "USER";
  }
}

export const authConfig = {
  // На проде сайт работает за обратным прокси, поэтому доверяем заголовкам
  // X-Forwarded-* — иначе NextAuth не определит адрес сайта и вход сломается.
  trustHost: true,
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/auth/login",
  },
  // Провайдеры добавляются в auth.ts (Node-runtime). Здесь пусто,
  // чтобы middleware не тянул за собой код с обращением к базе.
  providers: [],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER";
      }
      return session;
    },
    authorized({ auth, request }: any) {
      const url = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isAdmin = auth?.user?.role === "ADMIN";

      if (url.pathname.startsWith("/admin")) return isAdmin;
      if (url.pathname.startsWith("/dashboard")) return isLoggedIn;
      return true;
    },
  },
} satisfies NextAuthConfig;
