// ESLint 配置
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    // 允许 any 用于开发调试
    '@typescript-eslint/no-explicit-any': 'warn',
    // 未使用的变量警告
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    // 优先使用 const
    'prefer-const': 'warn',
    // 禁止 console（生产环境）
    'no-console': 'off',
    // 空函数警告
    '@typescript-eslint/no-empty-function': 'warn',
    // 接口名称规范
    '@typescript-eslint/interface-name-prefix': 'off',
    // 导出默认许可
    'import/export': 'off',
    // async 函数不需要 await
    '@typescript-eslint/require-await': 'off',
    // 允许 ts-ignore
    '@typescript-eslint/ban-ts-comment': 'off',
  },
  env: {
    node: true,
    es2022: true,
  },
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
};
