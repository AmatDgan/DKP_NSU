"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function deleteUserAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === session.user.id) return; // нельзя удалить самого себя
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}
