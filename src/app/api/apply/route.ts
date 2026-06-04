import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { upsertApplication } from "@/lib/application";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Полная заявка с лендинга: создаёт учётную запись (если нужно),
// сохраняет анкету в базу и СРАЗУ выполняет вход (ставит cookie сессии),
// чтобы пользователь не «вылетал» при переходе на главную.

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 дней

const schema = z
  .object({
    // Учётная запись
    email: z.string().email("Введите корректный e-mail"),
    password: z.string().min(8, "Пароль не короче 8 символов"),
    confirm: z.string().optional(),

    // Сведения об участнике (обязательны)
    fio: z.string().trim().min(1, "Укажите ФИО"),
    vuz: z.string().trim().min(1, "Укажите вуз"),
    city: z.string().trim().min(1, "Укажите город"),
    dept: z.string().trim().min(1, "Укажите подразделение"),
    position: z.string().trim().min(1, "Укажите должность"),
    phone: z.string().trim().min(1, "Укажите телефон"),

    // Удостоверение — обязательный вопрос
    wantsCertificate: z.enum(["yes", "no"], {
      errorMap: () => ({ message: "Ответьте на вопрос об удостоверении" }),
    }),
    // Отметка, что участник заполнил анкету ИППК (необязательно)
    ippkFilled: z.boolean().optional().default(false),

    // Проживание — обязательный вопрос
    residency: z.enum(["local", "nonresident"], {
      errorMap: () => ({ message: "Укажите вариант проживания" }),
    }),
    hotel: z.string().optional().nullable(),
    roomCategory: z.string().optional().nullable(),
    stayDates: z.string().optional().nullable(),
    roommatePrefs: z.string().optional().nullable(),

    // Секция — основная обязательна
    sectionPrimary: z.coerce.number().int().min(1, "Выберите основную секцию"),
    sectionSecondary: z.coerce.number().int().nullable().optional(),

    // Формат участия — обязателен
    participation: z.enum(["listener", "discussant", "brief", "report"], {
      errorMap: () => ({ message: "Выберите форму участия" }),
    }),
    abstract: z.string().optional().nullable(),

    // Культурная программа — обязательный выбор
    cultural: z.enum(["evolution", "museum", "books", "dome", "none"], {
      errorMap: () => ({ message: "Выберите вариант культурной программы" }),
    }),

    lectures: z.any().optional(),
    comments: z.string().optional().nullable(),

    consent: z.boolean().refine((v) => v === true, "Подтвердите согласие на обработку данных"),
    agree: z.boolean().refine((v) => v === true, "Подтвердите достоверность сведений"),
  })
  .superRefine((d, ctx) => {
    // При желании получить удостоверение анкета ИППК обязательна.
    if (d.wantsCertificate === "yes" && d.ippkFilled !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ippkFilled"],
        message: "Чтобы получить удостоверение, заполните анкету ИППК и подтвердите это",
      });
    }
    // Для иногородних, выбравших гостиницу НГУ, обязательны категория и даты.
    if (d.residency === "nonresident" && d.hotel === "nsu") {
      if (!d.roomCategory) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["roomCategory"], message: "Выберите категорию номера" });
      }
      if (!d.stayDates || !d.stayDates.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["stayDates"], message: "Укажите даты пребывания" });
      }
    }
  });

function isSecureCookie(req: NextRequest): boolean {
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (() => {
      try {
        return new URL(req.url).protocol.replace(":", "");
      } catch {
        return "http";
      }
    })();
  return proto === "https";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }

  // Защита от спама/перебора: не более 12 отправок анкеты за 10 минут с IP.
  const ip = clientIp(req.headers);
  const rl = rateLimit(`apply:${ip}`, 12, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Слишком много попыток. Повторите через ${rl.retryAfterSec} с.` },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const d = parsed.data;
  const email = d.email.trim().toLowerCase();

  try {
  // Если учётная запись уже есть — проверяем пароль, иначе создаём.
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const ok = await bcrypt.compare(d.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Пользователь с таким e-mail уже зарегистрирован. Введите верный пароль или войдите на странице входа.",
        },
        { status: 409 },
      );
    }
  } else {
    const passwordHash = await bcrypt.hash(d.password, 10);
    user = await prisma.user.create({ data: { email, passwordHash } });
  }

  // Фиксируем согласие на обработку ПДн.
  await prisma.user.update({
    where: { id: user.id },
    data: { consentGiven: true, consentAt: new Date() },
  });

  const lecturesStr =
    d.lectures != null ? JSON.stringify(d.lectures) : null;

  await upsertApplication(user.id, {
    fio: d.fio.trim(),
    vuz: d.vuz.trim(),
    city: d.city.trim(),
    department: d.dept.trim(),
    position: d.position.trim(),
    phone: d.phone.trim(),
    email,
    wantsCertificate: d.wantsCertificate === "yes",
    ippkFilled: d.ippkFilled === true,
    residency: d.residency,
    hotel: d.hotel ?? null,
    roomCategory: d.roomCategory ?? null,
    stayDates: d.stayDates ?? null,
    roommatePrefs: d.roommatePrefs ?? null,
    sectionPrimary: d.sectionPrimary,
    sectionSecondary: d.sectionSecondary ?? null,
    participation: d.participation,
    abstract: d.abstract ?? null,
    cultural: d.cultural,
    lectures: lecturesStr,
    comments: d.comments ?? null,
    consent: d.consent,
    agree: d.agree,
  });

  // Дублируем основные сведения в Profile, чтобы анкета в личном кабинете
  // была сразу заполнена тем, что участник ввёл при регистрации.
  const profileData = {
    fullName: d.fio.trim(),
    university: d.vuz.trim(),
    city: d.city.trim(),
    department: d.dept.trim(),
    position: d.position.trim(),
    phone: d.phone.trim(),
    contactEmail: email,
  };
  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...profileData },
    update: profileData,
  });

  // Выдаём cookie сессии вручную (форма на статической странице, поэтому
  // мы сами подписываем JWT тем же секретом, что использует NextAuth).
  const secure = isSecureCookie(req);
  const cookieName = secure ? "__Secure-authjs.session-token" : "authjs.session-token";
  const role = (user.role === "ADMIN" ? "ADMIN" : "USER") as "ADMIN" | "USER";

  const token = await encode({
    salt: cookieName,
    secret: process.env.AUTH_SECRET!,
    maxAge: SESSION_MAX_AGE,
    token: {
      sub: user.id,
      id: user.id,
      name: d.fio.trim(),
      email,
      role,
    },
  });

  const res = NextResponse.json({ ok: true, redirect: "/dashboard" });
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: SESSION_MAX_AGE,
  });
  return res;
  } catch (err) {
    console.error("[/api/apply] Ошибка сохранения заявки:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Не удалось сохранить заявку на сервере. Попробуйте ещё раз.",
      },
      { status: 500 },
    );
  }
}
