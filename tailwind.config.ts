import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1536px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          2: "hsl(var(--surface-2))",
          hover: "hsl(var(--surface-hover))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      boxShadow: {
        elevated: "var(--shadow-elevated)",
        player: "var(--shadow-player)",
      },
      backgroundImage: {
        brand: "var(--gradient-brand)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.94)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-in-bounce": {
          "0%":   { opacity: "0", transform: "scale(0.88) translateY(10px)" },
          "60%":  { opacity: "1", transform: "scale(1.03) translateY(-2px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-left": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(16px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "spin-in": {
          from: { transform: "rotate(-90deg) scale(0.6)", opacity: "0" },
          to: { transform: "rotate(0deg) scale(1)", opacity: "1" },
        },
        "mini-player-in": {
          from: { opacity: "0", transform: "translateY(24px) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "bottom-nav-in": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "chip-pop": {
          "0%":   { transform: "scale(1)" },
          "50%":  { transform: "scale(0.93)" },
          "100%": { transform: "scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-4px)" },
        },
        "pulse-ring": {
          "0%":   { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.4)" },
          "70%":  { boxShadow: "0 0 0 8px hsl(var(--primary) / 0)" },
          "100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0)" },
        },
        "stagger-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "modal-pop": {
          from: { opacity: "0", transform: "scale(0.88) translateY(12px)" },
          to:   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "sidebar-item-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in-down": "fade-in-down 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in-left": "fade-in-left 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in-right": "fade-in-right 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in-bounce": "scale-in-bounce 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-up": "slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-in-left": "slide-in-left 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-out-left": "slide-out-left 0.25s cubic-bezier(0.4, 0, 1, 1) forwards",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-out": "fade-out 0.25s ease-out forwards",
        "spin-in": "spin-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "mini-player-in": "mini-player-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "bottom-nav-in": "bottom-nav-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "chip-pop": "chip-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "float": "float 3s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.5s ease-out infinite",
        "stagger-in": "stagger-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "modal-pop": "modal-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "sidebar-item-in": "sidebar-item-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;