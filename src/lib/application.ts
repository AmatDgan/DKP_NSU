import { prisma } from "@/lib/prisma";

// Работа с заявками (Application) через Prisma-клиент.
//
// Раньше заявки читались/писались «сырым» SQL под SQLite (с PRAGMA и
// CREATE TABLE на лету). После перехода на MySQL таблицы создаются один раз
// командой `prisma db push`, а клиент знает модель Application, поэтому здесь
// используется обычный типобезопасный Prisma-клиент.

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
  createdAt: Date;
  updatedAt: Date;
};

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
  await prisma.application.upsert({
    where: { userId },
    create: { userId, ...d },
    // consent/agree обновляем тоже — это самостоятельная подача заявки участником
    update: { ...d },
  });
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
  const existing = await prisma.application.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.application.update({ where: { userId }, data: { ...d } });
  return true;
}

// Возвращает все заявки (для админ-панели).
export async function getAllApplications(): Promise<ApplicationRow[]> {
  return prisma.application.findMany();
}

export async function countApplications(): Promise<number> {
  return prisma.application.count();
}
