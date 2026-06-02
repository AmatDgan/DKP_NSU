import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSupport } from "./admin-chat";

export const metadata = { title: "Поддержка — админ" };

export default async function AdminSupportPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-ink">
            Чат поддержки
          </h1>
          <p className="text-brand-ink2">Обращения участников и ответы организаторов</p>
        </div>
        <Link href="/admin" className="btn-secondary text-sm">
          ← К админ-панели
        </Link>
      </header>

      <AdminSupport />

      <p className="text-sm text-brand-ink3">
        Участники без личного кабинета пишут на почту{" "}
        <a href="mailto:a.tolkochokov@g.nsu.ru" className="text-brand underline">
          a.tolkochokov@g.nsu.ru
        </a>
        .
      </p>
    </div>
  );
}
