"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Баннер согласия на cookie. Показывается, пока пользователь не сделает выбор.
// Сайт использует только технически необходимые cookie (сессия входа),
// поэтому достаточно уведомления с фиксацией согласия в localStorage.
const KEY = "cookieConsent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      saved = null;
    }
    if (saved !== "accepted" && saved !== "essential") {
      setVisible(true);
    }
  }, []);

  function decide(value: "accepted" | "essential") {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* localStorage недоступен — просто закрываем */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Согласие на использование cookie"
      className="fixed inset-x-4 bottom-4 z-[1000] mx-auto max-w-3xl rounded-2xl border border-brand-line bg-white p-5 shadow-xl"
    >
      <div className="flex flex-wrap items-center gap-4">
        <p className="min-w-[240px] flex-1 text-sm leading-relaxed text-brand-ink2">
          Мы используем файлы cookie, необходимые для работы сайта (вход в личный
          кабинет, безопасность сеанса). Продолжая пользоваться сайтом, вы
          соглашаетесь с этим. Подробнее — в{" "}
          <Link href="/consent" className="text-brand underline hover:opacity-80">
            политике обработки персональных данных
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => decide("essential")}
          >
            Только необходимые
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => decide("accepted")}
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
