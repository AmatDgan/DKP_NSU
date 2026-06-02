"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Conversation = {
  userId: string;
  email: string;
  name: string;
  lastBody: string;
  lastAt: string;
  lastFromAdmin: number | boolean;
  total: number;
  unreadForAdmin: number;
};

type Msg = {
  id: string;
  fromAdmin: number | boolean;
  body: string;
  createdAt: string;
};

function fmt(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

export function AdminSupport() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    try {
      const res = await fetch("/api/support/conversations", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setConvs(json.conversations);
    } catch {
      /* повторим при следующем опросе */
    }
  }, []);

  const loadThread = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/support?userId=${encodeURIComponent(userId)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.ok) setMessages(json.messages);
    } catch {
      /* повторим при следующем опросе */
    }
  }, []);

  // Опрос списка диалогов.
  useEffect(() => {
    loadConvs();
    const t = setInterval(loadConvs, 5000);
    return () => clearInterval(t);
  }, [loadConvs]);

  // Опрос выбранного треда.
  useEffect(() => {
    if (!selected) return;
    loadThread(selected);
    const t = setInterval(() => loadThread(selected), 4000);
    return () => clearInterval(t);
  }, [selected, loadThread]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function open(userId: string) {
    setSelected(userId);
    setMessages([]);
    // сбрасываем счётчик непрочитанного локально
    setConvs((cs) =>
      cs.map((c) => (c.userId === userId ? { ...c, unreadForAdmin: 0 } : c)),
    );
  }

  async function reply() {
    const body = text.trim();
    if (!body || !selected || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, userId: selected }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessages(json.messages);
        setText("");
        loadConvs();
      }
    } catch {
      /* оставим текст для повтора */
    } finally {
      setSending(false);
    }
  }

  const active = convs.find((c) => c.userId === selected);

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-4">
      {/* Список диалогов */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-brand-line font-serif font-bold text-brand-ink">
          Диалоги
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {convs.length === 0 && (
            <div className="px-4 py-6 text-sm text-brand-ink3">
              Обращений пока нет.
            </div>
          )}
          {convs.map((c) => (
            <button
              key={c.userId}
              type="button"
              onClick={() => open(c.userId)}
              className={`w-full text-left px-4 py-3 border-b border-brand-line/60 hover:bg-[#fafafa] ${
                selected === c.userId ? "bg-[#fff7f8]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-brand-ink truncate">
                  {c.name || c.email}
                </span>
                {c.unreadForAdmin > 0 && (
                  <span className="shrink-0 bg-brand text-white text-[11px] font-bold rounded-full px-2 py-0.5">
                    {c.unreadForAdmin}
                  </span>
                )}
              </div>
              {c.name && (
                <div className="text-xs text-brand-ink3 truncate">{c.email}</div>
              )}
              <div className="text-xs text-brand-ink3 truncate mt-0.5">
                {c.lastFromAdmin ? "Вы: " : ""}
                {c.lastBody}
              </div>
              <div className="text-[11px] text-brand-ink3 mt-0.5">{fmt(c.lastAt)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Тред */}
      <div className="card flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-brand-ink3 text-sm py-16">
            Выберите диалог слева, чтобы ответить участнику.
          </div>
        ) : (
          <>
            <div className="border-b border-brand-line pb-3 mb-3">
              <div className="font-serif font-bold text-brand-ink">
                {active?.name || active?.email}
              </div>
              {active?.name && (
                <div className="text-xs text-brand-ink3">{active.email}</div>
              )}
            </div>

            <div
              ref={scrollRef}
              className="h-72 overflow-y-auto rounded-lg border border-brand-line bg-[#fafafa] p-3 space-y-2"
            >
              {messages.length === 0 && (
                <div className="text-brand-ink3 text-sm">Сообщений нет.</div>
              )}
              {messages.map((m) => {
                const admin = !!m.fromAdmin;
                return (
                  <div
                    key={m.id}
                    className={`flex ${admin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                        admin
                          ? "bg-brand text-white"
                          : "bg-white border border-brand-line text-brand-ink"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div
                        className={`mt-1 text-[11px] ${
                          admin ? "text-white/70" : "text-brand-ink3"
                        }`}
                      >
                        {admin ? "Вы (организаторы)" : "Участник"} · {fmt(m.createdAt)}
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
                    reply();
                  }
                }}
                rows={2}
                placeholder="Ответ участнику… (Enter — отправить)"
                className="input flex-1 resize-none"
              />
              <button
                type="button"
                onClick={reply}
                disabled={sending || !text.trim()}
                className="btn-primary whitespace-nowrap disabled:opacity-50"
              >
                {sending ? "…" : "Ответить"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
