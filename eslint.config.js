import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', 'docs/reference']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // CLAUDE.md : TypeScript strict, pas de any.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Fondations (T69, proposition 6) : un bouton inactif garde le focus et sa place au clavier.
    // Les autres garde-fous du design sont dans scripts/verifier-design.mjs.
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXOpeningElement[name.name=/^(button|Bouton)$/] > JSXAttribute[name.name='disabled']",
          message:
            'Pas de disabled sur un bouton : aria-disabled, ou Bouton avec enCours ou indisponible (T69).',
        },
      ],
    },
  },
  {
    // Composants générés par shadcn/ui : ils exportent aussi leurs variantes.
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: [
      'e2e/**/*.ts',
      'tests/**/*.ts',
      'playwright.config.ts',
      'vite.config.ts',
      'vitest.fonctions.config.ts',
      'scripts/**/*.mjs',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
])
