import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#A21D33",
          ink: "#11161E",
          ink2: "#3C4655",
          ink3: "#6B7280",
          bg: "#FAFAF7",
          line: "#E5E1D8",
        },
      },
      fontFamily: {
        serif: ["'PT Serif'", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
export default config;
