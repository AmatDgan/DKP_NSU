import { prisma } from "@/lib/prisma";

// Чат поддержки между участником и администратором.
//
// Таблица SupportMessage описана в schema.prisma и создаётся командой
// `prisma db push`, поэтому работаем обычным Prisma-клиентом.

export type SupportMessageRow = {
  id: string;
  userId: string;
  fromAdmin: boolean;
  body: string;
  readByAdmin: boolean;
  readByUser: boolean;
  createdAt: Date;
};

// Добавляет сообщение в тред участника. fromAdmin=true — ответ администратора.
export async function addSupportMessage(
  userId: string,
  fromAdmin: boolean,
  body: string,
): Promise<void> {
  await prisma.supportMessage.create({
    data: {
      userId,
      fromAdmin,
      body,
      // сообщение прочитано тем, кто его отправил
      readByAdmin: fromAdmin,
      readByUser: !fromAdmin,
    },
  });
}

// Возвращает все сообщения треда участника по времени.
export async function getThread(userId: string): Promise<SupportMessageRow[]> {
  return prisma.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

// Помечает сообщения треда прочитанными для соответствующей стороны.
export async function markThreadRead(
  userId: string,
  by: "admin" | "user",
): Promise<void> {
  await prisma.supportMessage.updateMany({
    where: { userId },
    data: by === "admin" ? { readByAdmin: true } : { readByUser: true },
  });
}

export type Conversation = {
  userId: string;
  lastBody: string;
  lastAt: Date | null;
  lastFromAdmin: boolean;
  total: number;
  unreadForAdmin: number;
};

// Список диалогов для админа: последнее сообщение и число непрочитанных
// (от участника) по каждому пользователю.
export async function getConversations(): Promise<Conversation[]> {
  const groups = await prisma.supportMessage.groupBy({
    by: ["userId"],
    _max: { createdAt: true },
    _count: { _all: true },
  });
  // По времени последнего сообщения, новые сверху.
  groups.sort(
    (a, b) =>
      (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0),
  );

  const out: Conversation[] = [];
  for (const g of groups) {
    const [last, unread] = await Promise.all([
      prisma.supportMessage.findFirst({
        where: { userId: g.userId },
        orderBy: { createdAt: "desc" },
        select: { body: true, fromAdmin: true },
      }),
      prisma.supportMessage.count({
        where: { userId: g.userId, fromAdmin: false, readByAdmin: false },
      }),
    ]);
    out.push({
      userId: g.userId,
      lastBody: last?.body ?? "",
      lastAt: g._max.createdAt,
      lastFromAdmin: last?.fromAdmin ?? false,
      total: g._count._all,
      unreadForAdmin: unread,
    });
  }
  return out;
}

// Общее число непрочитанных администратором сообщений (для бейджа).
export async function countUnreadForAdmin(): Promise<number> {
  return prisma.supportMessage.count({
    where: { fromAdmin: false, readByAdmin: false },
  });
}
