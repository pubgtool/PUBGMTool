import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F6FA",
        surface: "#FFFFFF",
        dock: "#FFFFFF",
        profit: "#059669",
        fg: "#111827",
        "fg-secondary": "#4B5563",
        "fg-muted": "#69707E",
        ink: "#111827",
      },
      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,0.04)",
        btn: "0 6px 16px rgba(17,24,39,0.20)",
        "btn-green": "0 6px 16px rgba(5,150,105,0.25)",
        dock: "0 -4px 24px rgba(17,24,39,0.06)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shine: {
          "0%": { transform: "translateX(-140%) skewX(-20deg)" },
          "55%, 100%": { transform: "translateX(380%) skewX(-20deg)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        marquee: "marquee 70s linear infinite",
        shine: "shine 3.8s ease-in-out infinite",
        "gradient-shift": "gradientShift 9s ease-in-out infinite",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      transitionTimingFunction: { spring: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        ".pb-safe": { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" },
        ".pt-safe": { paddingTop: "max(0.5rem, env(safe-area-inset-top))" },
      });
    }),
  ],
};

export default config;
