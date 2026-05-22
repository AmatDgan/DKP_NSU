import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConsentForm } from "./consent-form";
import { revokeConsentAction } from "@/lib/actions/consent";

export const metadata = { title: "Согласие на обработку персональных данных" };

export default async function ConsentPage() {
  const session = await auth();
  const user = session?.user
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-bold text-brand-ink">
          Согласие на обработку персональных данных
        </h1>
        <p className="mt-2 text-brand-ink3">
          В соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».
        </p>
      </header>

      <section className="card space-y-4 text-brand-ink2 leading-relaxed">
        <p>
          Заполняя анкету в личном кабинете на сайте программы повышения квалификации
          «Денежно-кредитная политика: базовые знания и образовательные практики», вы
          предоставляете оператору — Новосибирскому государственному университету (НГУ) —
          согласие на обработку перечисленных ниже персональных данных в целях организации
          обучения и оформления документов о повышении квалификации.
        </p>
        <div>
          <h2 className="font-serif text-xl font-bold mt-2 mb-2 text-brand-ink">
            Перечень обрабатываемых данных
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Фамилия, имя, отчество (полностью)</li>
            <li>Наименование высшего учебного заведения</li>
            <li>Город</li>
            <li>Подразделение вуза (институт, факультет), в котором вы работаете</li>
            <li>Должность</li>
            <li>Контактный телефон</li>
            <li>Адрес электронной почты</li>
          </ul>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold mt-2 mb-2 text-brand-ink">
            Действия с данными
          </h2>
          <p>
            Сбор, запись, систематизация, накопление, хранение, уточнение (обновление,
            изменение), извлечение, использование, передача (предоставление) уполномоченным
            сотрудникам организаторов, обезличивание, блокирование, удаление, уничтожение —
            автоматизированными и неавтоматизированными способами.
          </p>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold mt-2 mb-2 text-brand-ink">
            Срок и отзыв
          </h2>
          <p>
            Согласие действует со дня его подтверждения до завершения программы и оформления
            документов о повышении квалификации либо до отзыва согласия. Согласие может быть
            отозвано в любое время через личный кабинет либо письменным заявлением на e-mail
            организаторов; после отзыва персональные данные подлежат удалению, кроме случаев,
            предусмотренных законом.
          </p>
        </div>
        <p className="text-sm text-brand-ink3">
          Отметка флажка ниже фиксирует факт ознакомления с условиями обработки и явное
          согласие на неё. Без подтверждения согласия загрузка персональных данных в систему
          невозможна.
        </p>
      </section>

      {user ? (
        user.consentGiven ? (
          <section className="card border-brand">
            <p className="text-brand-ink">
              <span className="font-semibold">Согласие подтверждено</span>{" "}
              {user.consentAt && (
                <span className="text-brand-ink3">
                  ({new Date(user.consentAt).toLocaleString("ru-RU")})
                </span>
              )}
            </p>
            <p className="mt-2 text-brand-ink2">
              Теперь вы можете заполнить анкету в <Link className="text-brand underline" href="/dashboard">личном кабинете</Link>.
            </p>
            <form
              action={async () => {
                "use server";
                await revokeConsentAction();
              }}
              className="mt-4"
            >
              <button className="btn-secondary text-sm" type="submit">
                Отозвать согласие
              </button>
            </form>
          </section>
        ) : (
          <ConsentForm />
        )
      ) : (
        <section className="card">
          <p className="text-brand-ink2">
            Чтобы подтвердить согласие, сначала{" "}
            <Link href="/auth/login" className="text-brand underline">войдите</Link>
            {" "}или{" "}
            <Link href="/auth/register" className="text-brand underline">зарегистрируйтесь</Link>.
          </p>
        </section>
      )}
    </article>
  );
}
