"use client";

import { useEffect, useRef, useState } from "react";

type Msg = {
  id: string;
  fromAdmin: number | boolean;
  body: string;
  createdAt: string;
};

const SUPPORT_EMAIL = "a.tolkochokov@g.nsu.ru";

function fmt(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

export function SupportChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/support", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setMessages(json.messages);
    } catch {
      /* молча — повторим при следующем опросе */
    } finally {
      setLoaded(true);
    }
  }

  // Первая загрузка + опрос каждые 5 секунд («онлайн»-чат).
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  // Автопрокрутка к последнему сообщению.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessages(json.messages);
        setText("");
      }
    } catch {
      /* оставим текст, чтобы можно было повторить */
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card">
      <h2 className="font-serif text-xl font-bold text-brand-ink mb-1">
        Чат поддержки
      </h2>
      <p className="text-brand-ink3 text-sm mb-4">
        Задайте вопрос организаторам — ответим прямо здесь. Или напишите на{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

      <div
        ref={scrollRef}
        className="h-72 overflow-y-auto rounded-lg border border-brand-line bg-[#fafafa] p-3 space-y-2"
      >
        {!loaded && <div className="text-brand-ink3 text-sm">Загрузка…</div>}
        {loaded && messages.length === 0 && (
          <div className="text-brand-ink3 text-sm">
            Сообщений пока нет. Напишите нам — мы на связи.
          </div>
        )}
        {messages.map((m) => {
          const admin = !!m.fromAdmin;
          return (
            <div
              key={m.id}
              className={`flex ${admin ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  admin
                    ? "bg-white border border-brand-line text-brand-ink"
                    : "bg-brand text-white"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div
                  className={`mt-1 text-[11px] ${
                    admin ? "text-brand-ink3" : "text-white/70"
                  }`}
                >
                  {admin ? "Организаторы" : "Вы"} · {fmt(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="Введите сообщение… (Enter — отправить, Shift+Enter — перенос строки)"
          className="input flex-1 resize-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim()}
          className="btn-primary whitespace-nowrap disabled:opacity-50"
        >
          {sending ? "…" : "Отправить"}
        </button>
      </div>
    </section>
  );
}
