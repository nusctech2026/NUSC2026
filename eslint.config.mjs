import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { settings: { next: { rootDir: ["apps/web/", "apps/store/"] } } },
  { rules: { "react/no-unescaped-entities": "off" } },
  globalIgnores([
    ".next/**",
    "apps/*/.next/**",
    "apps/*/out/**",
    "out/**",
    "artifacts/**",
    "**/next-env.d.ts",
  ]),
]);
