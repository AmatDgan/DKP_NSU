import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// Работа с заявками (Application) через «сырой» SQL.
//
// Почему так: модель Application добавлена в schema.prisma, но сгенерированный
// Prisma-клиент на машине пользователя может быть устаревшим (без `prisma.application`),
// а таблицы может не быть в dev.db, если не запускался `prisma db push`.
// Чтобы сайт работал без ручных команд, мы:
//   1) создаём таблицу при первом обращении (CREATE TABLE IF NOT EXISTS);
//   2) читаем/пишем заявки через $queryRawUnsafe / $executeRawUnsafe,
//      которые доступны всегда, независимо от набора моделей в клиенте.

export type ApplicationRow = {
  id: string;
  userId: string;
  fio: string;
  vuz: string;
  city: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  wantsCertificate: number | boolean;
  ippkFilled: number | boolean;
  residency: string;
  hotel: string | null;
  roomCategory: string | null;
  stayDates: string | null;
  roommatePrefs: string | null;
  sectionPrimary: number;
  sectionSecondary: number | null;
  participation: string;
  abstract: string | null;
  cultural: string;
  lectures: string | null;
  comments: string | null;
  consent: number | boolean;
  agree: number | boolean;
  createdAt: string;
  updatedAt: string;
};

let ensured = false;

export async function ensureApplicationTable(): Promise<void> {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Application" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "fio" TEXT NOT NULL,
      "vuz" TEXT NOT NULL,
      "city" TEXT NOT NULL,
      "department" TEXT NOT NULL,
      "position" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "wantsCertificate" BOOLEAN NOT NULL,
      "ippkFilled" BOOLEAN NOT NULL DEFAULT 0,
      "residency" TEXT NOT NULL,
      "hotel" TEXT,
      "roomCategory" TEXT,
      "stayDates" TEXT,
      "roommatePrefs" TEXT,
      "sectionPrimary" INTEGER NOT NULL,
      "sectionSecondary" INTEGER,
      "participation" TEXT NOT NULL,
      "abstract" TEXT,
      "cultural" TEXT NOT NULL,
      "lectures" TEXT,
      "comments" TEXT,
      "consent" BOOLEAN NOT NULL DEFAULT 0,
      "agree" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Application_userId_key" ON "Application"("userId")`,
  );

  // Миграция «на лету»: если таблица создана старой версией кода, дополняем
  // её недостающими колонками. SQLite не умеет ADD COLUMN IF NOT EXISTS,
  // поэтому сначала читаем список колонок и добавляем только отсутствующие.
  const cols = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `PRAGMA table_info("Application")`,
  );
  const have = new Set(cols.map((c) => c.name));
  const wanted: Record<string, string> = {
    ippkFilled: `ALTER TABLE "Application" ADD COLUMN "ippkFilled" BOOLEAN NOT NULL DEFAULT 0`,
  };
  for (const [name, sql] of Object.entries(wanted)) {
    if (!have.has(name)) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        // колонка уже есть или гонка — безопасно игнорируем
      }
    }
  }

  ensured = true;
}

export type ApplicationInput = {
  fio: string;
  vuz: string;
  city: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  wantsCertificate: boolean;
  ippkFilled: boolean;
  residency: string;
  hotel: string | null;
  roomCategory: string | null;
  stayDates: string | null;
  roommatePrefs: string | null;
  sectionPrimary: number;
  sectionSecondary: number | null;
  participation: string;
  abstract: string | null;
  cultural: string;
  lectures: string | null;
  comments: string | null;
  consent: boolean;
  agree: boolean;
};

// Создаёт или обновляет заявку пользователя (upsert по userId).
export async function upsertApplication(
  userId: string,
  d: ApplicationInput,
): Promise<void> {
  await ensureApplicationTable();
  const now = new Date().toISOString();

  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "Application" WHERE "userId" = ? LIMIT 1`,
    userId,
  );

  if (existing.length > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Application" SET
        "fio" = ?, "vuz" = ?, "city" = ?, "department" = ?, "position" = ?,
        "phone" = ?, "email" = ?, "wantsCertificate" = ?, "ippkFilled" = ?, "residency" = ?,
        "hotel" = ?, "roomCategory" = ?, "stayDates" = ?, "roommatePrefs" = ?,
        "sectionPrimary" = ?, "sectionSecondary" = ?, "participation" = ?,
        "abstract" = ?, "cultural" = ?, "lectures" = ?, "comments" = ?,
        "consent" = ?, "agree" = ?, "updatedAt" = ?
      WHERE "userId" = ?`,
      d.fio, d.vuz, d.city, d.department, d.position,
      d.phone, d.email, d.wantsCertificate ? 1 : 0, d.ippkFilled ? 1 : 0, d.residency,
      d.hotel, d.roomCategory, d.stayDates, d.roommatePrefs,
      d.sectionPrimary, d.sectionSecondary, d.participation,
      d.abstract, d.cultural, d.lectures, d.comments,
      d.consent ? 1 : 0, d.agree ? 1 : 0, now,
      userId,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Application" (
        "id", "userId", "fio", "vuz", "city", "department", "position",
        "phone", "email", "wantsCertificate", "ippkFilled", "residency", "hotel",
        "roomCategory", "stayDates", "roommatePrefs", "sectionPrimary",
        "sectionSecondary", "participation", "abstract", "cultural",
        "lectures", "comments", "consent", "agree", "createdAt", "updatedAt"
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      randomUUID(), userId, d.fio, d.vuz, d.city, d.department, d.position,
      d.phone, d.email, d.wantsCertificate ? 1 : 0, d.ippkFilled ? 1 : 0, d.residency, d.hotel,
      d.roomCategory, d.stayDates, d.roommatePrefs, d.sectionPrimary,
      d.sectionSecondary, d.participation, d.abstract, d.cultural,
      d.lectures, d.comments, d.consent ? 1 : 0, d.agree ? 1 : 0, now, now,
    );
  }
}

// Обновление заявки администратором. В отличие от upsert, НЕ создаёт новую
// заявку: если у пользователя ещё нет анкеты, возвращает false (нечего править).
// Поля consent/agree не трогаем — это юридические отметки самого участника.
export type AdminApplicationPatch = {
  fio: string;
  vuz: string;
  city: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  wantsCertificate: boolean;
  ippkFilled: boolean;
  residency: string;
  hotel: string | null;
  roomCategory: string | null;
  stayDates: string | null;
  roommatePrefs: string | null;
  sectionPrimary: number;
  sectionSecondary: number | null;
  participation: string;
  abstract: string | null;
  cultural: string;
  comments: string | null;
};

export async function adminUpdateApplication(
  userId: string,
  d: AdminApplicationPatch,
): Promise<boolean> {
  await ensureApplicationTable();
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "Application" WHERE "userId" = ? LIMIT 1`,
    userId,
  );
  if (existing.length === 0) return false;

  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `UPDATE "Application" SET
      "fio" = ?, "vuz" = ?, "city" = ?, "department" = ?, "position" = ?,
      "phone" = ?, "email" = ?, "wantsCertificate" = ?, "ippkFilled" = ?, "residency" = ?,
      "hotel" = ?, "roomCategory" = ?, "stayDates" = ?, "roommatePrefs" = ?,
      "sectionPrimary" = ?, "sectionSecondary" = ?, "participation" = ?,
      "abstract" = ?, "cultural" = ?, "comments" = ?, "updatedAt" = ?
    WHERE "userId" = ?`,
    d.fio, d.vuz, d.city, d.department, d.position,
    d.phone, d.email, d.wantsCertificate ? 1 : 0, d.ippkFilled ? 1 : 0, d.residency,
    d.hotel, d.roomCategory, d.stayDates, d.roommatePrefs,
    d.sectionPrimary, d.sectionSecondary, d.participation,
    d.abstract, d.cultural, d.comments, now,
    userId,
  );
  return true;
}

// Возвращает все заявки (для админ-панели).
export async function getAllApplications(): Promise<ApplicationRow[]> {
  await ensureApplicationTable();
  return prisma.$queryRawUnsafe<ApplicationRow[]>(
    `SELECT * FROM "Application"`,
  );
}

export async function countApplications(): Promise<number> {
  await ensureApplicationTable();
  const rows = await prisma.$queryRawUnsafe<{ n: number | bigint }[]>(
    `SELECT COUNT(*) AS n FROM "Application"`,
  );
  return Number(rows[0]?.n ?? 0);
}
