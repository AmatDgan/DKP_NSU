// Простой ограничитель частоты запросов (rate limiter) в памяти процесса.
// Назначение: затруднить перебор паролей и спам-отправку форм.
//
// Важное ограничение: на бессерверном хостинге (Vercel) у каждого инстанса
// своя память, поэтому лимит не общий на весь мир — это «первый рубеж».
// Для боевой защиты с общим счётчиком рекомендуется Upstash Ratelimit (Redis):
// см. ОБЛАКО_И_БЕЗОПАСНОСТЬ.md. Этот модуль закрывает базовые случаи и не
// требует внешних сервисов.

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Периодически чистим старые записи, чтобы карта не росла бесконечно.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

export type RateResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * Проверяет лимит для ключа (например, "login:<ip>").
 * @param key      уникальный ключ корзины
 * @param limit    сколько попыток разрешено в окне
 * @param windowMs длительность окна в миллисекундах
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);
  const cur = buckets.get(key);

  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (cur.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)),
    };
  }

  cur.count += 1;
  return { ok: true, remaining: limit - cur.count, retryAfterSec: 0 };
}

// Достаёт IP клиента из заголовков прокси (Vercel ставит x-forwarded-for).
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
