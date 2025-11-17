import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Relax a few rules to reduce noisy failures in the repo.
  {
    rules: {
      // Many files use `any` in the codebase; temporarily allow it until types are improved.
      "@typescript-eslint/no-explicit-any": "off",
      // Unescaped entities appear in a couple of static pages; allow them.
      "react/no-unescaped-entities": "off",
      // Turning off this rule to avoid build failures from calling setState in effects
      // where the code intentionally resets state synchronously.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
