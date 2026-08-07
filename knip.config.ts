import type { KnipConfig } from 'knip';

/**
 * Knip configuration for the ERP System monorepo (npm workspaces + Nx).
 *
 * Knip auto-detects most entry points from package.json (main/exports/scripts)
 * and via its built-in vite/vitest/eslint/nx/playwright plugins, so only the
 * exceptions are declared here:
 *
 * - `apps/e2e` test/util files are registered as entries (Playwright loads
 *   them via config, not via imports) to avoid false "unused file" reports.
 * - `mustache` is ignored for the templates service (loaded via a dynamic
 *   `requireCJS('mustache')` helper that cannot be resolved statically).
 * - The `.github/**` folder is ignored: its `.mjs` files are invoked from
 *   skill/prompt markdown (`node <skill_dir>/scripts/...`), not from code.
 * - A handful of Nx/ESLint toolchain packages are ignored where they are
 *   consumed only through config files and not auto-detected.
 */
const config: KnipConfig = {
  workspaces: {
    '.': {
      // Documented manual utility scripts (see scripts/translation/README.md)
      entry: ['scripts/translation/*.mjs'],
      ignore: ['.github/**'],
      ignoreDependencies: [
        '@nx/devkit',
        '@nx/eslint',
        '@nx/eslint-plugin',
        '@nx/js',
        '@nx/react',
        '@nx/web',
        '@nx/workspace',
        // ESLint toolchain used by the `npm run lint` workflow (no root eslint
        // config for knip to auto-detect)
        'eslint',
        'eslint-config-prettier',
        'eslint-plugin-react',
        'eslint-plugin-react-hooks',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
      ],
    },
    'apps/frontend': {
      // Referenced by docker-compose.dev.yml mount
      ignore: ['vite.config.d.ts'],
      ignoreDependencies: [
        '@nx/devkit',
        '@nx/eslint',
        '@nx/eslint-plugin',
        '@nx/js',
        '@nx/react',
        '@nx/vite',
        '@nx/web',
        '@nx/workspace',
        'nx',
        'eslint-plugin-react-hooks',
        '@typescript-eslint/eslint-plugin',
      ],
    },
    'apps/e2e': {
      // All Playwright files are loaded by playwright.config.ts.
      entry: ['tests/**/*.ts', 'utils/**/*.ts'],
    },
    // Not an npm workspace (apps/* glob does not reach it), but it is a project.
    'apps/services/nodejs/templates-service': {
      ignoreDependencies: ['mustache'],
    },
    'apps/gateway': {
      // rover is a global CLI used by the `compose` script
      ignoreBinaries: ['rover'],
    },
  },
};

export default config;
