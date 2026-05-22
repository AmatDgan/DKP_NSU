/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
