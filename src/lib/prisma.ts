import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Собираем настройки пула из строки DATABASE_URL.
// Поддерживаем подключение и по TCP (host:port), и по unix-сокету
// (?socket=/var/lib/mysql/mysql.sock) — на хостинге MySQL слушает сокет.
function poolConfig() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const database = url.pathname.replace(/^\//, "");
  const socketPath =
    url.searchParams.get("socket") || url.searchParams.get("socketPath");
  const base = { user, password, database, connectionLimit: 5 };
  return socketPath
    ? { ...base, socketPath }
    : {
        ...base,
        host: url.hostname || "127.0.0.1",
        port: url.port ? Number(url.port) : 3306,
      };
}

// Один экземпляр Prisma на процесс, чтобы при HMR в dev не плодились коннекты.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(poolConfig()),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
