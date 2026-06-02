import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import CookieConsent from "./cookie-consent";
import "./globals.css";

export const metadata: Metadata = {
  title: "ДКП — программа повышения квалификации | СГУ Банка России × НГУ",
  description:
    "Программа повышения квалификации «Денежно-кредитная политика: базовые знания и образовательные практики». 30 сентября — 1 октября 2026, НГУ, Новосибирск.",
};

async function HeaderNav() {
  const session = await auth();
  const user = session?.user;
  return (
    <header className="border-b border-brand-line bg-white">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg font-bold text-brand-ink">
          ДКП · СГУ × НГУ
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-brand-ink2 hover:text-brand">Главная</Link>
          <Link href="/consent" className="text-brand-ink2 hover:text-brand">Согласие на ОПД</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-brand-ink2 hover:text-brand">Кабинет</Link>
              {user.role === "ADMIN" && (
                <>
                  <Link href="/admin" className="text-brand hover:underline font-medium">Админ-панель</Link>
                  <Link href="/admin/support" className="text-brand hover:underline font-medium">Поддержка</Link>
                </>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="btn-secondary text-sm" type="submit">
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn-secondary text-sm">Войти</Link>
              <Link href="/auth/register" className="btn-primary text-sm">Регистрация</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <HeaderNav />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mt-16 border-t border-brand-line bg-white">
          <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-brand-ink3 flex flex-wrap gap-3 justify-between">
            <span>© 2026 СГУ Банка России × НГУ. Программа повышения квалификации.</span>
            <span className="flex gap-3">
            <Link href="/privacy" className="hover:text-brand">Политика обработки персональных данных</Link>
            <Link href="/consent" className="hover:text-brand">Согласие на ОПД</Link>
          </span>
          </div>
        </footer>
        <CookieConsent />
      </body>
    </html>
  );
}
