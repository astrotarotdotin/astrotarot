import type { Config } from "tailwindcss";

// Approved design direction: "Twilight" — a lightened version of the
// original near-black "void" reference, keeping the nebula/glitter/
// glass-morphism system intact. See SYSTEM.md for full project context.

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds — twilight, not void-black
        void: "#251C40",
        deep: "#1E1636",
        chamber: "#281F47",
        veil: "#332963",

        // Accents — unchanged from the approved reference
        rose: "#C4608A",
        "rose-soft": "#E8A0BB",
        "rose-glow": "#F0C4D8",
        violet: "#7B5EA7",
        "violet-mid": "#A07FC8",
        "violet-bright": "#C8A8F0",
        lavender: "#DDD0F8",
        teal: "#3B9E9A",
        "teal-bright": "#70D4CF",
        gold: "#E8C87A",
        "gold-dim": "#BF9A48",
        silver: "#D8D0F0",
        moonwhite: "#F5F0FF",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "serif"],
        ui: ["var(--font-ui)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
