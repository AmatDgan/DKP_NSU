import { prisma } from "@/lib/prisma";

// «Мягкое удаление» пользователей (архив).
//
// Идея: «Удалить» в админ-панели НЕ стирает учётку сразу, а переводит её в
// архив (проставляет archivedAt). Архивный пользователь:
//   • не показывается в основном списке участников;
//   • не учитывается в статистике;
//   • не может войти на сайт.
// Полное (необратимое) удаление со всеми связанными данными происходит только
// вторым действием — «Удалить навсегда» из раздела архива.
//
// Реализовано через «сырой» SQL по тем же причинам, что и Application
// (см. src/lib/application.ts): сгенерированный Prisma-клиент на машине
// пользователя может не знать о новых колонках, а здесь нам важно, чтобы всё
// работало без ручного запуска `prisma db push`/`prisma generate`.

let ensured = false;

// Добавляет колонки archivedAt / archivedBy в таблицу User, если их ещё нет.
export async function ensureUserArchiveColumns(): Promise<void> {
  if (ensured) return;
  try {
    const cols = await prisma.$queryRawUnsafe<{ name: string }[]>(
      `PRAGMA table_info("User")`,
    );
    const have = new Set(cols.map((c) => c.name));
    if (!have.has("archivedAt")) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN "archivedAt" DATETIME`,
      );
    }
    if (!have.has("archivedBy")) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN "archivedBy" TEXT`,
      );
    }
    ensured = true;
  } catch {
    // Гонка или колонка уже есть — безопасно игнорируем.
    ensured = true;
  }
}

// Переводит пользователя в архив (мягкое удаление).
export async function archiveUser(
  userId: string,
  adminEmail: string,
): Promise<void> {
  await ensureUserArchiveColumns();
  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "archivedAt" = ?, "archivedBy" = ? WHERE "id" = ?`,
    now,
    adminEmail,
    userId,
  );
}

// Восстанавливает пользователя из архива.
export async function restoreUser(userId: string): Promise<void> {
  await ensureUserArchiveColumns();
  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "archivedAt" = NULL, "archivedBy" = NULL WHERE "id" = ?`,
    userId,
  );
}

// Необратимо удаляет пользователя и все связанные данные.
// Удаляем связанные строки вручную, чтобы не зависеть от включённости
// SQLite-ограничений внешних ключей (PRAGMA foreign_keys).
export async function purgeUser(userId: string): Promise<void> {
  await ensureUserArchiveColumns();
  await prisma.$executeRawUnsafe(
    `DELETE FROM "Application" WHERE "userId" = ?`,
    userId,
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM "Profile" WHERE "userId" = ?`,
    userId,
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM "SupportMessage" WHERE "userId" = ?`,
    userId,
  );
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "id" = ?`, userId);
}

// Возвращает ID архивных пользователей (для фильтрации основного списка/статистики).
export async function getArchivedUserIds(): Promise<Set<string>> {
  await ensureUserArchiveColumns();
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "User" WHERE "archivedAt" IS NOT NULL`,
  );
  return new Set(rows.map((r) => r.id));
}

// Проверяет, находится ли пользователь в архиве (для блокировки входа).
export async function isUserArchived(userId: string): Promise<boolean> {
  await ensureUserArchiveColumns();
  const rows = await prisma.$queryRawUnsafe<{ archivedAt: string | null }[]>(
    `SELECT "archivedAt" FROM "User" WHERE "id" = ? LIMIT 1`,
    userId,
  );
  return Boolean(rows[0]?.archivedAt);
}

export type ArchivedUserRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  archivedAt: string;
  archivedBy: string | null;
  fio: string | null;
  vuz: string | null;
  city: string | null;
};

// Список архивных пользователей с базовой анкетной информацией.
export async function getArchivedUsers(): Promise<ArchivedUserRow[]> {
  await ensureUserArchiveColumns();
  return prisma.$queryRawUnsafe<ArchivedUserRow[]>(
    `SELECT u."id", u."email", u."role", u."createdAt", u."archivedAt", u."archivedBy",
            COALESCE(a."fio", p."fullName") AS "fio",
            COALESCE(a."vuz", p."university") AS "vuz",
            COALESCE(a."city", p."city") AS "city"
     FROM "User" u
     LEFT JOIN "Application" a ON a."userId" = u."id"
     LEFT JOIN "Profile" p ON p."userId" = u."id"
     WHERE u."archivedAt" IS NOT NULL
     ORDER BY u."archivedAt" DESC`,
  );
}
