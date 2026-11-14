import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    rules: {
      // coding-standards Section 2: no `any`, no `@ts-ignore`, no `as` casts.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
    },
  },
  {
    rules: {
      // coding-standards Section 4: no console output left behind.
      "no-console": "error",
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },
  {
    // Command-line scripts (the token generator) report results on the console by design.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);
