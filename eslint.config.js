// @ts-check
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      // Docusaurus build output and cache (generated, gitignored).
      'site/docs/**',
      'website/build/**',
      'website/.docusaurus/**',
      'site/index.html',
      'docs/**',
      // Root CommonJS tooling config — not part of the TS source graph.
      '*.config.js',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
);
