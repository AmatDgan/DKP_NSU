/**
 * Прогоняется командой `npm run db:seed`.
 * Создаёт пользователя-администратора, если его ещё нет.
 *
 * Логин и пароль ОБЯЗАТЕЛЬНО задаются через env-переменные:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME (опционально)
 *
 * Скрипт намеренно НЕ имеет «дефолтного» пароля: если переменные не заданы
 * или пароль слишком слабый/общеизвестный, выполнение прерывается с ошибкой.
 * Это исключает появление на проде учётки вида admin@example.com / admin12345.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// tsx не подгружает .env автоматически, поэтому читаем файл сами.
// Значения из реального окружения имеют приоритет над .env.
function loadDotEnv() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  } catch {
    // .env может отсутствовать — это не ошибка, переменные могут идти из окружения.
  }
}
loadDotEnv();

const prisma = new PrismaClient();

// SQLite не поддерживает enum, поэтому роли — обычные строки.
const ROLE_ADMIN = "ADMIN";

// Заведомо небезопасные значения, которые нельзя использовать на проде.
const FORBIDDEN_EMAILS = ["admin@example.com", "admin@admin.com", "test@test.com"];
const FORBIDDEN_PASSWORDS = ["admin12345", "admin", "password", "12345678", "qwerty"];
const MIN_PASSWORD_LENGTH = 12;

function fail(message: string): never {
  console.error(`\n[seed] ОШИБКА: ${message}\n`);
  console.error(
    "Задайте безопасные значения в файле .env, например:\n" +
      '  SEED_ADMIN_EMAIL="org@nsu.ru"\n' +
      '  SEED_ADMIN_PASSWORD="<надёжный пароль не короче 12 символов>"\n' +
      '  SEED_ADMIN_NAME="Администратор"\n\n' +
      "Сгенерировать пароль: openssl rand -base64 18\n",
  );
  process.exit(1);
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Администратор";

  if (!email) fail("не задана переменная SEED_ADMIN_EMAIL.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(`некорректный e-mail: ${email}`);
  if (FORBIDDEN_EMAILS.includes(email.toLowerCase()))
    fail(`e-mail ${email} — пример из документации, использовать его на проде нельзя.`);

  if (!password) fail("не задана переменная SEED_ADMIN_PASSWORD.");
  if (password.length < MIN_PASSWORD_LENGTH)
    fail(`пароль слишком короткий (нужно не меньше ${MIN_PASSWORD_LENGTH} символов).`);
  if (FORBIDDEN_PASSWORDS.includes(password.toLowerCase()))
    fail("пароль входит в список общеизвестных и небезопасных. Задайте уникальный пароль.");

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Учётка уже есть: синхронизируем пароль и роль с текущими значениями .env.
    // Это позволяет переустановить пароль админа повторным запуском db:seed.
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, role: ROLE_ADMIN },
    });
    console.log(
      `[seed] Учётка ${email} обновлена: роль ADMIN, пароль сброшен на значение из SEED_ADMIN_PASSWORD`,
    );
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: ROLE_ADMIN,
      consentGiven: true,
      consentAt: new Date(),
      profile: {
        create: {
          fullName: name,
          university: "—",
          city: "—",
          department: "—",
          position: "Администратор системы",
          phone: "—",
          contactEmail: email,
        },
      },
    },
  });
  console.log(`[seed] Создан админ: ${email} (пароль задан через SEED_ADMIN_PASSWORD)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
