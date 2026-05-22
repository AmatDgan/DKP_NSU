import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setUserRoleAction, deleteUserAction } from "@/lib/actions/admin";

export const metadata = { title: "Админ-панель" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [users, totalUsers, totalWithProfile, totalConsented] = await Promise.all([
    prisma.user.findMany({
      include: { profile: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.profile.count(),
    prisma.user.count({ where: { consentGiven: true } }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-bold text-brand-ink">Админ-панель</h1>
        <p className="text-brand-ink2">Управление пользователями и просмотр персональных данных</p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-brand-ink3">Всего пользователей</div>
          <div className="text-3xl font-serif font-bold mt-1 text-brand-ink">{totalUsers}</div>
        </div>
        <div className="card">
          <div className="text-sm text-brand-ink3">Заполнили анкету</div>
          <div className="text-3xl font-serif font-bold mt-1 text-brand-ink">{totalWithProfile}</div>
        </div>
        <div className="card">
          <div className="text-sm text-brand-ink3">Дали согласие на ОПД</div>
          <div className="text-3xl font-serif font-bold mt-1 text-brand-ink">{totalConsented}</div>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-bold mb-3">Пользователи</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-ink3 border-b border-brand-line">
                <th className="py-2 pr-3">E-mail / Роль</th>
                <th className="py-2 pr-3">ФИО</th>
                <th className="py-2 pr-3">ВУЗ / Город</th>
                <th className="py-2 pr-3">Подразделение / Должность</th>
                <th className="py-2 pr-3">Контакты</th>
                <th className="py-2 pr-3">Согласие</th>
                <th className="py-2 pr-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === session.user.id;
                return (
                  <tr key={u.id} className="border-b border-brand-line/60 align-top">
                    <td className="py-3 pr-3">
                      <div className="font-medium text-brand-ink">{u.email}</div>
                      <div className="text-xs text-brand-ink3">
                        {u.role}
                        {isSelf && " · вы"}
                      </div>
                      <div className="text-xs text-brand-ink3">
                        Создан: {new Date(u.createdAt).toLocaleString("ru-RU")}
                      </div>
                    </td>
                    <td className="py-3 pr-3">{u.profile?.fullName ?? "—"}</td>
                    <td className="py-3 pr-3">
                      <div>{u.profile?.university ?? "—"}</div>
                      <div className="text-brand-ink3">{u.profile?.city ?? ""}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div>{u.profile?.department ?? "—"}</div>
                      <div className="text-brand-ink3">{u.profile?.position ?? ""}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div>{u.profile?.phone ?? "—"}</div>
                      <div className="text-brand-ink3">{u.profile?.contactEmail ?? ""}</div>
                    </td>
                    <td className="py-3 pr-3">
                      {u.consentGiven ? (
                        <span className="text-green-700">Да</span>
                      ) : (
                        <span className="text-brand">Нет</span>
                      )}
                      {u.consentAt && (
                        <div className="text-xs text-brand-ink3">
                          {new Date(u.consentAt).toLocaleString("ru-RU")}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-3 space-y-2">
                      <form action={setUserRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="role" defaultValue={u.role} className="input !py-1 !px-2 text-xs w-24">
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <button className="btn-secondary text-xs !py-1 !px-2" type="submit">
                          Применить
                        </button>
                      </form>
                      {!isSelf && (
                        <form action={deleteUserAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button
                            type="submit"
                            className="text-xs text-brand underline"
                          >
                            Удалить
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-brand-ink3">
                    Пока никто не зарегистрирован.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="font-serif text-lg font-bold mb-2">Как ещё выдать админские права</h2>
        <p className="text-brand-ink2 text-sm">
          Помимо переключения роли в таблице выше, роль <code>ADMIN</code> можно выдать прямо
          через Prisma Studio:
        </p>
        <pre className="mt-2 bg-[#11161E] text-white text-xs p-3 rounded overflow-x-auto">
{`npm run db:studio
# откроется http://localhost:5555 — найдите пользователя в таблице User
# и поменяйте поле role на ADMIN`}
        </pre>
        <p className="text-brand-ink2 text-sm mt-3">
          Или через seed (создаёт админа при первом запуске):
        </p>
        <pre className="mt-2 bg-[#11161E] text-white text-xs p-3 rounded overflow-x-auto">
{`# в .env задайте SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run db:seed`}
        </pre>
      </section>
    </div>
  );
}
