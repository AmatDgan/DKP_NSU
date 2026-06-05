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
// Колонки archivedAt / archivedBy описаны в schema.prisma и создаются командой
// `prisma db push`, поэтому работаем обычным Prisma-клиентом.

// Переводит пользователя в архив (мягкое удаление).
export async function archiveUser(
  userId: string,
  adminEmail: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { archivedAt: new Date(), archivedBy: adminEmail },
  });
}

// Восстанавливает пользователя из архива.
export async function restoreUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { archivedAt: null, archivedBy: null },
  });
}

// Необратимо удаляет пользователя. Связанные строки (Application, Profile,
// SupportMessage) удаляются каскадом — в schema.prisma у связей onDelete: Cascade.
export async function purgeUser(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}

// Возвращает ID архивных пользователей (для фильтрации основного списка/статистики).
export async function getArchivedUserIds(): Promise<Set<string>> {
  const rows = await prisma.user.findMany({
    where: { archivedAt: { not: null } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

// Проверяет, находится ли пользователь в архиве (для блокировки входа).
export async function isUserArchived(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { archivedAt: true },
  });
  return Boolean(u?.archivedAt);
}

export type ArchivedUserRow = {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  archivedAt: Date | null;
  archivedBy: string | null;
  fio: string | null;
  vuz: string | null;
  city: string | null;
};

// Список архивных пользователей с базовой анкетной информацией.
export async function getArchivedUsers(): Promise<ArchivedUserRow[]> {
  const users = await prisma.user.findMany({
    where: { archivedAt: { not: null } },
    include: { application: true, profile: true },
    orderBy: { archivedAt: "desc" },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    archivedAt: u.archivedAt,
    archivedBy: u.archivedBy,
    fio: u.application?.fio ?? u.profile?.fullName ?? null,
    vuz: u.application?.vuz ?? u.profile?.university ?? null,
    city: u.application?.city ?? u.profile?.city ?? null,
  }));
}
