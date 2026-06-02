import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  addSupportMessage,
  getThread,
  markThreadRead,
} from "@/lib/support";

// GET /api/support            — тред текущего пользователя (и отметка «прочитано»)
// GET /api/support?userId=ID   — тред указанного участника (только для админа)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const qUser = req.nextUrl.searchParams.get("userId")?.trim();

  // Админ может смотреть чужой тред; обычный пользователь — только свой.
  const targetUserId = isAdmin && qUser ? qUser : session.user.id;

  try {
    const messages = await getThread(targetUserId);
    await markThreadRead(targetUserId, isAdmin && qUser ? "admin" : "user");
    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    console.error("[/api/support GET]", err);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}

// POST /api/support  { body, userId? }
// Пользователь пишет в свой тред; админ отвечает в тред userId.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Не авторизован" }, { status: 401 });
  }

  let data: { body?: string; userId?: string };
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }

  const body = (data.body ?? "").trim();
  if (!body) {
    return NextResponse.json({ ok: false, error: "Пустое сообщение" }, { status: 422 });
  }
  if (body.length > 4000) {
    return NextResponse.json(
      { ok: false, error: "Сообщение слишком длинное (до 4000 символов)" },
      { status: 422 },
    );
  }

  const isAdmin = session.user.role === "ADMIN";
  const targetUserId = isAdmin && data.userId ? data.userId.trim() : session.user.id;
  const fromAdmin = isAdmin && !!data.userId;

  try {
    await addSupportMessage(targetUserId, fromAdmin, body);
    const messages = await getThread(targetUserId);
    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    console.error("[/api/support POST]", err);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}
