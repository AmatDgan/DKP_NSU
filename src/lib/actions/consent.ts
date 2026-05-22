"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ConsentState = { error?: string; ok?: boolean };

/**
 * Записывает явное согласие на обработку персональных данных.
 * Без этого согласия серверные действия по сохранению профиля будут отказывать.
 */
export async function giveConsentAction(
  _prev: ConsentState,
  formData: FormData,
): Promise<ConsentState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Войдите, чтобы подтвердить согласие" };
  }
  const checked = formData.get("agree") === "on";
  if (!checked) {
    return { error: "Чтобы продолжить, отметьте флажок согласия" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { consentGiven: true, consentAt: new Date() },
  });

  revalidatePath("/dashboard");
  revalidatePath("/consent");
  redirect("/dashboard");
}

/** Снять согласие (для теста / удаления данных). */
export async function revokeConsentAction(): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { consentGiven: false, consentAt: null },
  });
  revalidatePath("/dashboard");
  revalidatePath("/consent");
}
