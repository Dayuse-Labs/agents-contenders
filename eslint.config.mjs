import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/** Config ESLint (flat) : règles Next + garde-fous vibe-coding. */
const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'] },
];

export default config;
