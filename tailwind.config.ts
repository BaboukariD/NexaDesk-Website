import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        arabic: ["IBM Plex Sans Arabic", "Noto Naskh Arabic", "Tahoma", "sans-serif"],
      },
      lineHeight: {
        arabic: "1.9",
      },
      colors: {
        paper: "#F6F3EC",
        ink: "#1E1B16",
        "ink-muted": "#6B6558",
        accent: "#2F6F62",
        "accent-muted": "#E4ECE9",
        error: "#A3574C",
        "error-muted": "#F4E9E7",
        line: "#DDD6C7",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
