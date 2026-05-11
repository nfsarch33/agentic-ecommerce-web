// ESLint v9 flat config wired to Next.js core web vitals and TypeScript rules.
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
