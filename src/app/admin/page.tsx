import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setUserRoleAction, deleteUserAction, updateUserAction } from "@/lib/actions/admin";
import { getAllApplications, countApplications, type ApplicationRow } from "@/lib/application";
import { countUnreadForAdmin } from "@/lib/support";

export const metadata = { title: "Админ-панель" };

// Справочники для расшифровки сохранённых значений анкеты.
const SECTIONS: Record<number, string> = {
  1: "Особенности современной ДКП центральных банков стран мира",
  2: "Влияние ЦБ на финансовые рынки. Инновации. Рынок ЦФА",
  3: "Повышение финансовой и инвестиционной грамотности населения",
  4: "Социологические исследования экономического неравенства",
  5: "Структурные эффекты ДКП",
  6: "Трансмиссия ДКП через рыночные ожидания (риск-премия)",
  7: "Моделирование доли потерь при дефолте (LGD)",
};

const HOTELS: Record<string, string> = {
  nsu: "Гостиница НГУ",
  gold: "Золотая долина",
  mirodom: "Миродом",
  academ: "Академ",
  parkwood: "Парк Вуд",
  other: "Другой / решу позже",
};

const RESIDENCY: Record<string, string> = {
  local: "Из Новосибирска",
  nonresident: "Иногородний",
};

const CULTURAL: Record<string, string> = {
  evolution: "«Эволюция Земли»",
  museum: "Музей истории НГУ",
  books: "Архив древних книг",
  dome: "Купол ректорского корпуса",
  none: "Не участвует",
};

const PARTICIPATION: Record<string, string> = {
  listener: "Слушатель",
  discussant: "Дискуссант",
  brief: "Краткое сообщение",
  report: "Доклад",
};

const ROOM: Record<string, string> = {
  single: "Одноместный",
  double: "Двухместный",
  econom: "Эконом",
  standard: "Стандарт",
};

// Лекции Банка России в том же порядке, что и на лендинге (для расшифровки JSON).
const LECTURES: string[] = [
  "Экономика в цифрах: почему важно управлять инфляцией",
  "Решения на основе макроэкономических прогнозов: модельный аппарат Банка России",
  "Актуальные направления исследований в области ДКП",
  "Коммуникация по денежно-кредитной политике",
  "Работа трансмиссионного механизма ДКП и анализ инфляции в регионах",
  "Откуда берутся деньги",
  "Как центральные банки управляют процентными ставками. Ликвидность банковского сектора",
];

const LEC_CHOICE: Record<string, string> = {
  yes: "Планирую",
  maybe: "Не решил(а)",
  no: "Не планирую",
};

// Расшифровка JSON-строки с выбором по лекциям в читаемый список.
function parseLectures(raw: string | null): { title: string; choice: string }[] {
  if (!raw) return [];
  try {
    const obj = JSON.parse(raw) as Record<string, string>;
    return Object.entries(obj)
      .map(([k, v]) => ({
        title: LECTURES[Number(k)] ?? `Лекция ${Number(k) + 1}`,
        choice: LEC_CHOICE[v] ?? v,
      }))
      .filter((x) => x.choice);
  } catch {
    return [];
  }
}

function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

// Одна строка «подпись → значение» в карточке подробностей участника.
function Field({ label, children }: { label: string; children: ReactNode }) {
  const empty =
    children === null ||
    children === undefined ||
    children === "" ||
    children === false;
  return (
    <div className="py-1.5 border-b border-brand-line/40">
      <div className="text-xs text-brand-ink3">{label}</div>
      <div className="text-brand-ink whitespace-pre-wrap break-words">
        {empty ? "—" : children}
      </div>
    </div>
  );
}

type SP = Record<string, string | string[] | undefined>;
function pick(sp: SP, key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v ?? "").trim();
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const sp = searchParams;
  const q = pick(sp, "q");
  const fSection = pick(sp, "section");
  const fHotel = pick(sp, "hotel");
  const fResidency = pick(sp, "residency");
  const fCultural = pick(sp, "cultural");
  const fCity = pick(sp, "city");

  const [baseUsers, totalUsers, totalWithApp, totalConsented, apps, unreadSupport] =
    await Promise.all([
      prisma.user.findMany({
        include: { profile: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
      countApplications(),
      prisma.user.count({ where: { consentGiven: true } }),
      getAllApplications(),
      countUnreadForAdmin(),
    ]);

  // Сопоставляем заявки с пользователями по userId.
  const appByUser = new Map<string, ApplicationRow>();
  for (const a of apps) appByUser.set(a.userId, a);
  const allUsers = baseUsers.map((u) => ({
    ...u,
    application: appByUser.get(u.id) ?? null,
  }));

  // Список городов для выпадающего фильтра (из анкет и профилей).
  const cityset = new Set<string>();
  for (const u of allUsers) {
    const c = (u.application?.city ?? u.profile?.city ?? "").trim();
    if (c) cityset.add(c);
  }
  const cities = Array.from(cityset).sort((a, b) => a.localeCompare(b, "ru"));

  const ql = q.toLowerCase();
  const users = allUsers.filter((u) => {
    const a = u.application;
    const p = u.profile;
    // Текстовый поиск: ФИО, город, вуз, e-mail.
    if (ql) {
      const hay = [
        a?.fio,
        p?.fullName,
        a?.city,
        p?.city,
        a?.vuz,
        p?.university,
        a?.email,
        u.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    if (fSection) {
      const n = Number(fSection);
      if (a?.sectionPrimary !== n && a?.sectionSecondary !== n) return false;
    }
    if (fHotel && a?.hotel !== fHotel) return false;
    if (fResidency && a?.residency !== fResidency) return false;
    if (fCultural && a?.cultural !== fCultural) return false;
    if (fCity) {
      const c = (a?.city ?? p?.city ?? "").trim();
      if (c !== fCity) return false;
    }
    return true;
  });

  const hasFilters = Boolean(
    q || fSection || fHotel || fResidency || fCultural || fCity,
  );

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-ink">Админ-панель</h1>
          <p className="text-brand-ink2">Управление участниками и просмотр анкет</p>
        </div>
        <Link href="/admin/support" className="btn-secondary text-sm inline-flex items-center gap-2">
          Чат поддержки
          {unreadSupport > 0 && (
            <span className="bg-brand text-white text-[11px] font-bold rounded-full px-2 py-0.5">
              {unreadSupport}
            </span>
          )}
        </Link>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-brand-ink3">Всего пользователей</div>
          <div className="text-3xl font-serif font-bold mt-1 text-brand-ink">{totalUsers}</div>
        </div>
        <div className="card">
          <div className="text-sm text-brand-ink3">Подали заявку</div>
          <div className="text-3xl font-serif font-bold mt-1 text-brand-ink">{totalWithApp}</div>
        </div>
        <div className="card">
          <div className="text-sm text-brand-ink3">Дали согласие на ОПД</div>
          <div className="text-3xl font-serif font-bold mt-1 text-brand-ink">{totalConsented}</div>
        </div>
      </section>

      <section className="card">
        <h2 className="font-serif text-lg font-bold mb-3">Поиск и фильтры</h2>
        <form method="get" className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-brand-ink3">Поиск (ФИО, город, вуз, e-mail)</label>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Например: Иванов или Новосибирск"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-brand-ink3">Город</label>
              <select name="city" defaultValue={fCity} className="input w-full">
                <option value="">Все города</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-brand-ink3">Секция</label>
              <select name="section" defaultValue={fSection} className="input w-full">
                <option value="">Любая</option>
                {Object.entries(SECTIONS).map(([id, t]) => (
                  <option key={id} value={id}>
                    {id} — {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-brand-ink3">Проживание</label>
              <select name="residency" defaultValue={fResidency} className="input w-full">
                <option value="">Любое</option>
                {Object.entries(RESIDENCY).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-brand-ink3">Гостиница</label>
              <select name="hotel" defaultValue={fHotel} className="input w-full">
                <option value="">Любая</option>
                {Object.entries(HOTELS).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-brand-ink3">Культурная программа</label>
              <select name="cultural" defaultValue={fCultural} className="input w-full">
                <option value="">Любая</option>
                {Object.entries(CULTURAL).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary">
              Применить
            </button>
            {hasFilters && (
              <Link href="/admin" className="text-sm text-brand underline">
                Сбросить
              </Link>
            )}
            <span className="text-sm text-brand-ink3">
              Найдено: {users.length}
            </span>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-serif text-xl font-bold mb-3">Участники</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-ink3 border-b border-brand-line">
                <th className="py-2 pr-3">E-mail / Роль</th>
                <th className="py-2 pr-3">ФИО</th>
                <th className="py-2 pr-3">ВУЗ / Город</th>
                <th className="py-2 pr-3">Секции</th>
                <th className="py-2 pr-3">Проживание</th>
                <th className="py-2 pr-3">Культ. программа</th>
                <th className="py-2 pr-3">Удост.</th>
                <th className="py-2 pr-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === session.user.id;
                const a = u.application;
                const p = u.profile;
                const fio = a?.fio ?? p?.fullName ?? "—";
                const vuz = a?.vuz ?? p?.university ?? "—";
                const city = a?.city ?? p?.city ?? "";
                const lecRows = parseLectures(a?.lectures ?? null);
                return (
                  <Fragment key={u.id}>
                  <tr className="border-t border-brand-line/60 align-top">
                    <td className="py-3 pr-3">
                      <div className="font-medium text-brand-ink">{u.email}</div>
                      <div className="text-xs text-brand-ink3">
                        {u.role}
                        {isSelf && " · вы"}
                      </div>
                      <div className="text-xs text-brand-ink3">
                        {a?.phone ?? p?.phone ?? ""}
                      </div>
                    </td>
                    <td className="py-3 pr-3">{fio}</td>
                    <td className="py-3 pr-3">
                      <div>{vuz}</div>
                      <div className="text-brand-ink3">{city}</div>
                    </td>
                    <td className="py-3 pr-3">
                      {a ? (
                        <>
                          <div>
                            <span className="text-brand-ink3">осн.:</span> {a.sectionPrimary}
                          </div>
                          {a.sectionSecondary != null && (
                            <div className="text-brand-ink3">рез.: {a.sectionSecondary}</div>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {a ? (
                        <>
                          <div>{RESIDENCY[a.residency] ?? a.residency}</div>
                          {a.hotel && (
                            <div className="text-brand-ink3">{HOTELS[a.hotel] ?? a.hotel}</div>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {a ? CULTURAL[a.cultural] ?? a.cultural : "—"}
                    </td>
                    <td className="py-3 pr-3">
                      {a ? (a.wantsCertificate ? "Да" : "Нет") : "—"}
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
                          <button type="submit" className="text-xs text-brand underline">
                            Удалить
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-brand-line">
                    <td colSpan={8} className="pb-4 pt-0">
                      <details className="text-sm">
                        <summary className="cursor-pointer select-none text-brand font-medium">
                          Показать все данные участника
                        </summary>
                        <div className="mt-3 grid lg:grid-cols-2 gap-x-8">
                          <div>
                            <div className="font-serif font-bold text-brand-ink mb-1">
                              Учётная запись
                            </div>
                            <Field label="E-mail (логин)">{u.email}</Field>
                            <Field label="Роль">{u.role}</Field>
                            <Field label="Согласие на обработку ПДн">
                              {u.consentGiven
                                ? `Дано · ${fmtDate(u.consentAt)}`
                                : "Не дано"}
                            </Field>
                            <Field label="Дата регистрации">
                              {fmtDate(u.createdAt)}
                            </Field>

                            <div className="font-serif font-bold text-brand-ink mb-1 mt-4">
                              Сведения об участнике
                            </div>
                            <Field label="ФИО">{a?.fio ?? p?.fullName}</Field>
                            <Field label="ВУЗ">{a?.vuz ?? p?.university}</Field>
                            <Field label="Город">{a?.city ?? p?.city}</Field>
                            <Field label="Подразделение">
                              {a?.department ?? p?.department}
                            </Field>
                            <Field label="Должность">
                              {a?.position ?? p?.position}
                            </Field>
                            <Field label="Телефон">{a?.phone ?? p?.phone}</Field>
                            <Field label="Контактный e-mail">
                              {a?.email ?? p?.contactEmail}
                            </Field>
                          </div>

                          <div>
                            <div className="font-serif font-bold text-brand-ink mb-1">
                              Удостоверение и участие
                            </div>
                            <Field label="Хочет удостоверение">
                              {a ? (a.wantsCertificate ? "Да" : "Нет") : undefined}
                            </Field>
                            <Field label="Анкета ИППК заполнена">
                              {a ? (a.ippkFilled ? "Да" : "Нет") : undefined}
                            </Field>
                            <Field label="Основная секция">
                              {a
                                ? `${a.sectionPrimary} — ${SECTIONS[a.sectionPrimary] ?? ""}`
                                : undefined}
                            </Field>
                            <Field label="Резервная секция">
                              {a?.sectionSecondary != null
                                ? `${a.sectionSecondary} — ${SECTIONS[a.sectionSecondary] ?? ""}`
                                : undefined}
                            </Field>
                            <Field label="Форма участия">
                              {a ? PARTICIPATION[a.participation] ?? a.participation : undefined}
                            </Field>
                            <Field label="Тезисы">{a?.abstract}</Field>

                            <div className="font-serif font-bold text-brand-ink mb-1 mt-4">
                              Проживание
                            </div>
                            <Field label="Проживание">
                              {a ? RESIDENCY[a.residency] ?? a.residency : undefined}
                            </Field>
                            <Field label="Гостиница">
                              {a?.hotel ? HOTELS[a.hotel] ?? a.hotel : undefined}
                            </Field>
                            <Field label="Категория номера">
                              {a?.roomCategory ? ROOM[a.roomCategory] ?? a.roomCategory : undefined}
                            </Field>
                            <Field label="Даты пребывания">{a?.stayDates}</Field>
                            <Field label="Пожелания по подселению">
                              {a?.roommatePrefs}
                            </Field>

                            <div className="font-serif font-bold text-brand-ink mb-1 mt-4">
                              Программа
                            </div>
                            <Field label="Культурная программа">
                              {a ? CULTURAL[a.cultural] ?? a.cultural : undefined}
                            </Field>
                            <Field label="Лекции">
                              {lecRows.length ? (
                                <ul className="list-disc pl-4 space-y-0.5">
                                  {lecRows.map((l, i) => (
                                    <li key={i}>
                                      {l.title} — <span className="text-brand-ink3">{l.choice}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : undefined}
                            </Field>
                            <Field label="Комментарии участника">{a?.comments}</Field>
                            <Field label="Подтверждения">
                              {a
                                ? `Согласие на ОПД: ${a.consent ? "да" : "нет"} · Достоверность: ${a.agree ? "да" : "нет"}`
                                : undefined}
                            </Field>
                            <Field label="Заявка обновлена">
                              {a ? fmtDate(a.updatedAt) : undefined}
                            </Field>
                          </div>
                        </div>
                      </details>

                      {a && (
                        <details className="text-sm mt-3">
                          <summary className="cursor-pointer select-none text-brand font-medium">
                            Редактировать данные участника
                          </summary>
                          <form action={updateUserAction} className="mt-3 space-y-3">
                            <input type="hidden" name="userId" value={u.id} />

                            <div className="font-serif font-bold text-brand-ink">Сведения об участнике</div>
                            <div className="grid sm:grid-cols-2 gap-3">
                              <label className="block">
                                <span className="text-xs text-brand-ink3">ФИО</span>
                                <input name="fio" defaultValue={a.fio} className="input w-full" />
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Контактный e-mail</span>
                                <input name="email" defaultValue={a.email} className="input w-full" />
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">ВУЗ</span>
                                <input name="vuz" defaultValue={a.vuz} className="input w-full" />
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Город</span>
                                <input name="city" defaultValue={a.city} className="input w-full" />
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Подразделение</span>
                                <input name="department" defaultValue={a.department} className="input w-full" />
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Должность</span>
                                <input name="position" defaultValue={a.position} className="input w-full" />
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Телефон</span>
                                <input name="phone" defaultValue={a.phone} className="input w-full" />
                              </label>
                            </div>

                            <div className="font-serif font-bold text-brand-ink mt-2">Удостоверение и участие</div>
                            <div className="grid sm:grid-cols-2 gap-3">
                              <label className="flex items-center gap-2">
                                <input type="checkbox" name="wantsCertificate" defaultChecked={!!a.wantsCertificate} />
                                <span className="text-sm text-brand-ink">Хочет удостоверение</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input type="checkbox" name="ippkFilled" defaultChecked={!!a.ippkFilled} />
                                <span className="text-sm text-brand-ink">Анкета ИППК заполнена</span>
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Основная секция</span>
                                <select name="sectionPrimary" defaultValue={String(a.sectionPrimary)} className="input w-full">
                                  {Object.entries(SECTIONS).map(([id, t]) => (
                                    <option key={id} value={id}>{id} — {t}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Резервная секция</span>
                                <select name="sectionSecondary" defaultValue={a.sectionSecondary != null ? String(a.sectionSecondary) : ""} className="input w-full">
                                  <option value="">Нет</option>
                                  {Object.entries(SECTIONS).map(([id, t]) => (
                                    <option key={id} value={id}>{id} — {t}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Форма участия</span>
                                <select name="participation" defaultValue={a.participation} className="input w-full">
                                  {Object.entries(PARTICIPATION).map(([v, t]) => (
                                    <option key={v} value={v}>{t}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Культурная программа</span>
                                <select name="cultural" defaultValue={a.cultural} className="input w-full">
                                  {Object.entries(CULTURAL).map(([v, t]) => (
                                    <option key={v} value={v}>{t}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <label className="block">
                              <span className="text-xs text-brand-ink3">Тезисы</span>
                              <textarea name="abstract" defaultValue={a.abstract ?? ""} rows={2} className="input w-full" />
                            </label>

                            <div className="font-serif font-bold text-brand-ink mt-2">Проживание</div>
                            <div className="grid sm:grid-cols-2 gap-3">
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Проживание</span>
                                <select name="residency" defaultValue={a.residency} className="input w-full">
                                  {Object.entries(RESIDENCY).map(([v, t]) => (
                                    <option key={v} value={v}>{t}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Гостиница</span>
                                <select name="hotel" defaultValue={a.hotel ?? ""} className="input w-full">
                                  <option value="">—</option>
                                  {Object.entries(HOTELS).map(([v, t]) => (
                                    <option key={v} value={v}>{t}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Категория номера</span>
                                <select name="roomCategory" defaultValue={a.roomCategory ?? ""} className="input w-full">
                                  <option value="">—</option>
                                  {Object.entries(ROOM).map(([v, t]) => (
                                    <option key={v} value={v}>{t}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="text-xs text-brand-ink3">Даты пребывания</span>
                                <input name="stayDates" defaultValue={a.stayDates ?? ""} className="input w-full" />
                              </label>
                              <label className="block sm:col-span-2">
                                <span className="text-xs text-brand-ink3">Пожелания по подселению</span>
                                <input name="roommatePrefs" defaultValue={a.roommatePrefs ?? ""} className="input w-full" />
                              </label>
                            </div>

                            <label className="block">
                              <span className="text-xs text-brand-ink3">Комментарии участника</span>
                              <textarea name="comments" defaultValue={a.comments ?? ""} rows={2} className="input w-full" />
                            </label>

                            <div className="flex items-center gap-3">
                              <button type="submit" className="btn-primary text-sm">Сохранить изменения</button>
                              <span className="text-xs text-brand-ink3">Логин и пароль не меняются</span>
                            </div>
                          </form>
                        </details>
                      )}
                    </td>
                  </tr>
                  </Fragment>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-brand-ink3">
                    {hasFilters
                      ? "По заданным условиям никого не найдено."
                      : "Пока никто не зарегистрирован."}
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
      </section>
    </div>
  );
}
