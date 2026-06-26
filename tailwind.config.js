/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./client/src/**/*.{ts,tsx,html}", "./client/index.html"],
  theme: {
    extend: {
      colors: {
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        arabic: ["Cairo", "Noto Kufi Arabic", "sans-serif"],
        sans:   ["Cairo", "Noto Kufi Arabic", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "card":    "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-md": "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)",
        "card-lg": "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.06)",
        "glow-primary": "0 0 20px hsl(var(--primary) / 0.25)",
      },
      animation: {
        "pulse-slow":  "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":     "fadeIn 0.35s ease-out forwards",
        "slide-up":    "slideUp 0.3s ease-out forwards",
        "slide-down":  "slideDown 0.2s ease-out",
        "spin-slow":   "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn:    { "0%": { opacity: "0", transform: "translateY(6px)" },  "100%": { opacity: "1", transform: "translateY(0)" } },
        slideUp:   { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideDown: { "0%": { opacity: "0", transform: "translateY(-8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)",
        "gradient-card":    "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
      },
    },
  },
  plugins: [],
};
