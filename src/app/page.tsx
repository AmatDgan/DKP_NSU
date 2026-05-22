import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  return (
    <div className="space-y-12">
      <section className="card">
        <p className="text-sm uppercase tracking-wider text-brand-ink3">
          30 сентября — 1 октября 2026 · Новосибирск, НГУ
        </p>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mt-3 text-brand-ink">
          Денежно-кредитная политика: базовые знания и образовательные практики
        </h1>
        <p className="mt-4 text-brand-ink2 text-lg leading-relaxed max-w-3xl">
          Программа повышения квалификации для преподавателей вузов социально-экономического
          профиля. Совместный проект Сибирского главного управления Банка России и
          Новосибирского государственного университета.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {session?.user ? (
            <Link href="/dashboard" className="btn-primary">Перейти в личный кабинет</Link>
          ) : (
            <>
              <Link href="/auth/register" className="btn-primary">Зарегистрироваться</Link>
              <Link href="/auth/login" className="btn-secondary">У меня уже есть аккаунт</Link>
            </>
          )}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-serif font-bold text-xl mb-2">Кто может участвовать</h3>
          <p className="text-brand-ink2">
            Преподаватели вузов, ведущие дисциплины экономико-финансового профиля.
          </p>
        </div>
        <div className="card">
          <h3 className="font-serif font-bold text-xl mb-2">Формат</h3>
          <p className="text-brand-ink2">
            Очные лекции и практикумы от экспертов Банка России и преподавателей НГУ.
          </p>
        </div>
        <div className="card">
          <h3 className="font-serif font-bold text-xl mb-2">Документ</h3>
          <p className="text-brand-ink2">
            По итогам — удостоверение о повышении квалификации установленного образца.
          </p>
        </div>
      </section>

      <section className="card">
        <h2 className="font-serif text-2xl font-bold text-brand-ink">Регистрация</h2>
        <p className="mt-3 text-brand-ink2 max-w-3xl">
          Чтобы подать заявку, создайте аккаунт и заполните анкету в личном кабинете.
          Перед сохранением персональных данных необходимо подтвердить{" "}
          <Link href="/consent" className="text-brand underline">согласие на их обработку</Link>.
        </p>
      </section>
    </div>
  );
}
