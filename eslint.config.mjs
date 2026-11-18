import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Destructuring a field out just to exclude it from a `...rest`
      // spread (`const { x: _x, ...rest } = obj`) is the standard way to
      // do that in TS - the `_`-prefixed binding is deliberately unused.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
      // React Compiler readiness rules - this project doesn't use the
      // compiler (no babel-plugin-react-compiler, no next.config
      // reactCompiler flag). These two fire on long-standing, intentional,
      // safe patterns already in production (next-themes mount-detection,
      // computing `twelveWeeksAgo` in a Server Component render) rather
      // than real bugs, and "fixing" them would mean restructuring ~20
      // components for a feature this app doesn't opt into. Off until we
      // actually adopt the compiler. The other react-compiler rules
      // (refs/immutability/static-components) stay on - those caught two
      // real issues in dashboard/workouts/new/page.tsx and
      // group-climbing-meetups.tsx, both fixed.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
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
