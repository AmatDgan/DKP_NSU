import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// Чат поддержки между участником и администратором.
//
// Как и заявки (Application), сообщения храним через «сырой» SQL, чтобы сайт
// работал без ручного `prisma db push` и не зависел от устаревшего клиента.
// Таблица создаётся автоматически при первом обращении.

export type SupportMessageRow = {
  id: string;
  userId: string;
  fromAdmin: number | boolean;
  body: string;
  readByAdmin: number | boolean;
  readByUser: number | boolean;
  createdAt: string;
};

let ensured = false;

export async function ensureSupportTable(): Promise<void> {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SupportMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "fromAdmin" BOOLEAN NOT NULL DEFAULT 0,
      "body" TEXT NOT NULL,
      "readByAdmin" BOOLEAN NOT NULL DEFAULT 0,
      "readByUser" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SupportMessage_userId_idx" ON "SupportMessage"("userId")`,
  );
  ensured = true;
}

// Добавляет сообщение в тред участника. fromAdmin=true — ответ администратора.
export async function addSupportMessage(
  userId: string,
  fromAdmin: boolean,
  body: string,
): Promise<void> {
  await ensureSupportTable();
  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "SupportMessage"
      ("id","userId","fromAdmin","body","readByAdmin","readByUser","createdAt")
      VALUES (?,?,?,?,?,?,?)`,
    randomUUID(),
    userId,
    fromAdmin ? 1 : 0,
    body,
    // сообщение прочитано тем, кто его отправил
    fromAdmin ? 1 : 0,
    fromAdmin ? 0 : 1,
    now,
  );
}

// Возвращает все сообщения треда участника по времени.
export async function getThread(userId: string): Promise<SupportMessageRow[]> {
  await ensureSupportTable();
  return prisma.$queryRawUnsafe<SupportMessageRow[]>(
    `SELECT * FROM "SupportMessage" WHERE "userId" = ? ORDER BY "createdAt" ASC`,
    userId,
  );
}

// Помечает сообщения треда прочитанными для соответствующей стороны.
export async function markThreadRead(
  userId: string,
  by: "admin" | "user",
): Promise<void> {
  await ensureSupportTable();
  const col = by === "admin" ? "readByAdmin" : "readByUser";
  await prisma.$executeRawUnsafe(
    `UPDATE "SupportMessage" SET "${col}" = 1 WHERE "userId" = ?`,
    userId,
  );
}

export type Conversation = {
  userId: string;
  lastBody: string;
  lastAt: string;
  lastFromAdmin: number | boolean;
  total: number;
  unreadForAdmin: number;
};

// Список диалогов для админа: последнее сообщение и число непрочитанных
// (от участника) по каждому пользователю.
export async function getConversations(): Promise<Conversation[]> {
  await ensureSupportTable();
  const rows = await prisma.$queryRawUnsafe<
    {
      userId: string;
      lastAt: string;
      total: number | bigint;
      unreadForAdmin: number | bigint;
    }[]
  >(
    `SELECT "userId",
            MAX("createdAt") AS "lastAt",
            COUNT(*) AS "total",
            SUM(CASE WHEN "fromAdmin" = 0 AND "readByAdmin" = 0 THEN 1 ELSE 0 END) AS "unreadForAdmin"
     FROM "SupportMessage"
     GROUP BY "userId"
     ORDER BY "lastAt" DESC`,
  );

  const out: Conversation[] = [];
  for (const r of rows) {
    const last = await prisma.$queryRawUnsafe<
      { body: string; fromAdmin: number | boolean }[]
    >(
      `SELECT "body","fromAdmin" FROM "SupportMessage"
       WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT 1`,
      r.userId,
    );
    out.push({
      userId: r.userId,
      lastBody: last[0]?.body ?? "",
      lastAt: r.lastAt,
      lastFromAdmin: last[0]?.fromAdmin ?? 0,
      total: Number(r.total),
      unreadForAdmin: Number(r.unreadForAdmin),
    });
  }
  return out;
}

// Общее число непрочитанных администратором сообщений (для бейджа).
export async function countUnreadForAdmin(): Promise<number> {
  await ensureSupportTable();
  const rows = await prisma.$queryRawUnsafe<{ n: number | bigint }[]>(
    `SELECT COUNT(*) AS n FROM "SupportMessage" WHERE "fromAdmin" = 0 AND "readByAdmin" = 0`,
  );
  return Number(rows[0]?.n ?? 0);
}
