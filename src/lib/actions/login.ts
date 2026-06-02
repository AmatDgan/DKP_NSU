"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().email("Введите корректный e-mail"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // Ограничение на перебор: не более 8 попыток входа за 5 минут с одного IP.
  const ip = clientIp(headers());
  const rl = rateLimit(`login:${ip}`, 8, 5 * 60 * 1000);
  if (!rl.ok) {
    return {
      error: `Слишком много попыток входа. Повторите через ${rl.retryAfterSec} с.`,
    };
  }

  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Неверный e-mail или пароль" };
    }
    throw err; // redirect Next.js идёт исключением — пропускаем дальше
  }
}
