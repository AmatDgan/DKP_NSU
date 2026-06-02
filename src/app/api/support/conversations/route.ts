import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConversations } from "@/lib/support";

// GET /api/support/conversations — список диалогов с данными участников (для админа).
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Нет доступа" }, { status: 403 });
  }

  try {
    const convs = await getConversations();
    const ids = convs.map((c) => c.userId);
    const users = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          include: { profile: true },
        })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    const items = convs.map((c) => {
      const u = byId.get(c.userId);
      return {
        ...c,
        email: u?.email ?? "(удалён)",
        name: u?.profile?.fullName ?? "",
      };
    });

    return NextResponse.json({ ok: true, conversations: items });
  } catch (err) {
    console.error("[/api/support/conversations]", err);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}
