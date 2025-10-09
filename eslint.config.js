import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        localStorage: 'readonly',
        Headers: 'readonly',
        fetch: 'readonly',
        RequestInit: 'readonly',
        document: 'readonly',
        window: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        FormData: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
    },
  },
  // Module boundary: Prevent libs from importing from apps
  {
    files: ['libs/**/*.ts'],
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '*apps*',
                'todo-api',
                'todo-api/**',
                'todo-ui',
                'todo-ui/**',
              ],
              message:
                'Libraries cannot import from apps. Libs should be independent of apps.',
            },
          ],
        },
      ],
    },
  },
  // Module boundary: Prevent todo-api from importing from todo-ui
  {
    files: ['apps/todo-api/**/*.ts'],
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['todo-ui', 'todo-ui/**', '**/todo-ui/**'],
              message:
                'todo-api cannot import from todo-ui. Apps should not depend on each other.',
            },
          ],
        },
      ],
    },
  },
  // Module boundary: Prevent todo-ui from importing from todo-api
  {
    files: ['apps/todo-ui/**/*.ts', 'apps/todo-ui/**/*.tsx'],
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['todo-api', 'todo-api/**', '**/todo-api/**'],
              message:
                'todo-ui cannot import from todo-api. Apps should not depend on each other.',
            },
          ],
        },
      ],
    },
  },
  // Module boundary: Prevent deep imports into libs (enforce public interface)
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@demo-todo/*/src',
                '@demo-todo/*/src/**',
                '@demo-todo/*/*',
              ],
              message:
                'Deep imports into lib packages are not allowed. Import from the package root (e.g., "@demo-todo/api-contracts" instead of "@demo-todo/api-contracts/src/...").',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '.claude/**',
      '.devbox/**',
    ],
  },
];
