export default [
  {
    ignores: ['dist', 'build', 'node_modules'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-duplicate-imports': 'error',
      'no-trailing-spaces': 'warn',
      'indent': ['warn', 2],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'semi': ['warn', 'always'],
    },
  },
];
