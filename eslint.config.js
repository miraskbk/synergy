import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
    },
  },
  {
    files: [
      'server/**/*.{js,mjs,cjs}',
      'cli/**/*.{js,mjs,cjs}',
      'test/**/*.{js,mjs,cjs}',
      'eslint.config.js',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['client/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.browser },
  },
]
