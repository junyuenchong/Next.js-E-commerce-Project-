import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "out/**",
      "coverage/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/app/**/api/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/backend/features/*/*.service",
                "@/backend/features/*/*.service.*",
                "@/backend/features/*/*.repo",
                "@/backend/features/*/*.repo.*",
                "@/backend/features/*/*.route-handler",
                "@/backend/features/*/*.route-handler.*",
              ],
              message:
                "Do not deep-import backend module internals from app/api routes. Import from the module entrypoint (e.g. `@/backend/features/<module>`) or a module action instead.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
