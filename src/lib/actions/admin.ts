"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminUpdateApplication } from "@/lib/application";
import { archiveUser, restoreUser, purgeUser } from "@/lib/archive";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Доступ только для администратора");
  }
  return session;
}

export async function setUserRoleAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || (role !== "ADMIN" && role !== "USER")) return;
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
}

// Редактирование данных участника администратором.
// Обновляет анкету (Application), профиль (Profile) и контактный e-mail.
// Логин/пароль и юридические согласия здесь НЕ меняются.
export async function updateUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const s = (k: string) => String(formData.get(k) ?? "").trim();
  const sn = (k: string) => {
    const v = s(k);
    return v === "" ? null : v;
  };
  const num = (k: string): number => {
    const n = Number(s(k));
    return Number.isFinite(n) ? n : 0;
  };
  const numOrNull = (k: string): number | null => {
    const v = s(k);
    if (v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const bool = (k: string) => formData.get(k) === "on" || formData.get(k) === "yes";

  const fio = s("fio");
  const vuz = s("vuz");
  const city = s("city");
  const department = s("department");
  const position = s("position");
  const phone = s("phone");
  const contactEmail = s("email");

  await adminUpdateApplication(userId, {
    fio,
    vuz,
    city,
    department,
    position,
    phone,
    email: contactEmail,
    wantsCertificate: bool("wantsCertificate"),
    ippkFilled: bool("ippkFilled"),
    residency: s("residency") || "local",
    hotel: sn("hotel"),
    roomCategory: sn("roomCategory"),
    stayDates: sn("stayDates"),
    roommatePrefs: sn("roommatePrefs"),
    sectionPrimary: num("sectionPrimary"),
    sectionSecondary: numOrNull("sectionSecondary"),
    participation: s("participation") || "listener",
    abstract: sn("abstract"),
    cultural: s("cultural") || "none",
    comments: sn("comments"),
  });

  // Зеркалим контактные данные в профиль, чтобы они совпадали в кабинете.
  const profileData = {
    fullName: fio,
    university: vuz,
    city,
    department,
    position,
    phone,
    contactEmail,
  };
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  });

  revalidatePath("/admin");
}

// «Удалить» в таблице участников = мягкое удаление: переводим в архив.
// Данные сохраняются, пользователь скрывается из списка и не может войти.
export async function deleteUserAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === session.user.id) return; // нельзя удалить самого себя
  await archiveUser(userId, session.user.email ?? "admin");
  revalidatePath("/admin");
}

// Восстановление пользователя из архива.
export async function restoreUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  await restoreUser(userId);
  revalidatePath("/admin");
}

// Необратимое удаление из архива — вторым действием.
// Требуется явное подтверждение (поле confirm="ПОЛНОСТЬЮ") во избежание случайностей.
export async function purgeUserAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!userId || userId === session.user.id) return; // себя удалить нельзя
  if (confirm !== "ПОЛНОСТЬЮ") return; // защита от случайного нажатия
  await purgeUser(userId);
  revalidatePath("/admin");
}
