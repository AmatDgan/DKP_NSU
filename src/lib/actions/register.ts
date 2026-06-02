"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";

const schema = z
  .object({
    email: z.string().email("Введите корректный e-mail"),
    password: z.string().min(8, "Пароль не короче 8 символов"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Пароли не совпадают",
  });

export type RegisterState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { error: "Пользователь с таким e-mail уже зарегистрирован" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, passwordHash },
  });

  // Сразу логиним. ВАЖНО: используем redirectTo, чтобы NextAuth сам
  // выставил cookie сессии и выполнил переход одним ответом. Прежняя связка
  // `redirect:false` + ручной `redirect()` теряла cookie — пользователь
  // оказывался разлогинен при следующем переходе (баг «авто-выхода»).
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/consent",
  });

  // до сюда исполнение не доходит: signIn выбрасывает redirect.
  return {};
}
