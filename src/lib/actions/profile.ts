"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  fullName: z.string().trim().min(3, "Укажите ФИО полностью"),
  university: z.string().trim().min(3, "Укажите наименование вуза"),
  city: z.string().trim().min(2, "Укажите город"),
  department: z.string().trim().min(2, "Укажите подразделение"),
  position: z.string().trim().min(2, "Укажите должность"),
  phone: z.string().trim().min(5, "Укажите телефон"),
  contactEmail: z.string().trim().email("Введите корректный e-mail"),
});

export type ProfileState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function saveProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Требуется вход" };
  }

  // ❗ Без согласия на ОПД сохранять перс. данные нельзя.
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Пользователь не найден" };
  if (!user.consentGiven) {
    return {
      error:
        "Без согласия на обработку персональных данных загрузка анкеты невозможна. Перейдите на страницу «Согласие на ОПД» и поставьте флажок.",
    };
  }

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    university: formData.get("university"),
    city: formData.get("city"),
    department: formData.get("department"),
    position: formData.get("position"),
    phone: formData.get("phone"),
    contactEmail: formData.get("contactEmail"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: { ...parsed.data },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}
