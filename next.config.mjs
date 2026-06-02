// Заголовки безопасности — применяются ко всем ответам сайта.
// Защищают от кликджекинга, MIME-sniffing, утечки реферера и принуждают HTTPS.
const securityHeaders = [
  // Принудительный HTTPS на полгода (включая поддомены). Действует только
  // когда сайт открыт по https — на проде (Vercel/домен) это и нужно.
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  // Запрет встраивать сайт в чужие <iframe> (защита от clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Запрет браузеру «угадывать» тип файла (защита от XSS через подмену типа).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Не передавать полный адрес страницы на сторонние сайты.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Отключаем доступ к камере/микрофону/геолокации — сайту они не нужны.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // не раскрываем, что сайт на Next.js
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Подменяем главную страницу: вместо React-компонента отдаём
  // оригинальный лендинг из public/landing/index.html без обёртки лейаута.
  // beforeFiles срабатывает РАНЬШЕ, чем app/page.tsx, поэтому URL остаётся `/`,
  // а пользователь видит исходный дизайн со всеми разделами и стилями.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/landing/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
