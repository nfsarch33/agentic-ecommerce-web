// Tailwind v4 uses the `@tailwindcss/postcss` plugin; no separate
// tailwind.config.{ts,js} is required. Class names are scanned from
// the source via @import in src/app/globals.css.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
