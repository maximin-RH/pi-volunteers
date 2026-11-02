import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next.js 16 removed `next lint`; this is the equivalent setup for `npm run lint`.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Apostrophes in JSX text render safely; escaping them makes the copy hard to read and edit.
      "react/no-unescaped-entities": "off",
      // Deliberate: next/image uses Vercel's paid image optimisation quota. Our images are small and
      // already sized, so plain <img> is the cost-efficient choice (see CLAUDE.md, Cost).
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts", "supabase/**", "docs/**"]),
]);
