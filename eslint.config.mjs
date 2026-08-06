import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  { languageOptions: { globals: { ...globals.node, ...globals.jest }, parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } }, ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'] },
  { files: ['**/*.spec.ts'], rules: { '@typescript-eslint/no-unsafe-assignment': 'off' } },
);
