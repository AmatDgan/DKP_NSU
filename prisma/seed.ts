/**
 * Прогоняется командой `npm run db:seed`.
 * Создаёт пользователя-администратора, если его ещё нет.
 *
 * Значения логина/пароля задаются через env:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// SQLite не поддерживает enum, поэтому роли — обычные строки.
const ROLE_ADMIN = "ADMIN";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";
  const name = process.env.SEED_ADMIN_NAME ?? "Администратор";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== ROLE_ADMIN) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: ROLE_ADMIN },
      });
      console.log(`[seed] Пользователю ${email} выдана роль ADMIN`);
    } else {
      console.log(`[seed] Админ уже существует: ${email}`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
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
  console.log(`[seed] Создан админ: ${email} (пароль: ${password})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
