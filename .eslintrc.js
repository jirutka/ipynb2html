module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    project: [
      './tsconfig.json',
      './test/tsconfig.json',
    ],
  },
  env: {
    es6: true,
    node: true,
  },
  settings: {
    'import/resolver': {
      // Use eslint-import-resolver-typescript to obey "paths" in tsconfig.json.
      typescript: {},
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'standard-with-typescript',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    // Disable in favour of TypeScript rule.
    'func-call-spacing': 'off',
    'linebreak-style': ['error', 'unix'],
    'lines-between-class-members': 'off',
    // Disable in favour of TypeScript rule.
    'no-extra-semi': 'off',
    'no-multi-spaces': ['warn', {
      ignoreEOLComments: true,
    }],
    'no-multiple-empty-lines': ['warn', {
      max: 2,
      maxEOF: 1,
      maxBOF: 1,
    }],
    'no-template-curly-in-string': 'off',
    'operator-linebreak': ['error', 'before'],
    'padded-blocks': ['warn', {
      switches: 'never',
    }],
    'quote-props': ['error', 'consistent-as-needed'],
    // Disable in favour of TypeScript rule.
    'semi': 'off',

    // Import
    'import/newline-after-import': 'warn',
    'import/order': ['warn', {
      'groups': [['builtin', 'external']],
      'newlines-between': 'always-and-inside-groups',
    }],

    // TypeScript
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-member-accessibility': ['warn', {
      accessibility: 'no-public',
      overrides: {
        parameterProperties: 'off',
      },
    }],
    '@typescript-eslint/func-call-spacing': ['error', 'never'],
    '@typescript-eslint/indent': ['error', 2, {
      SwitchCase: 1,
      VariableDeclarator: 1,
      outerIIFEBody: 1,
      MemberExpression: 1,
      // Changed parameters from 1 to off.
      FunctionDeclaration: { parameters: 'off', body: 1 },
      // Changed parameters from 1 to off.
      FunctionExpression: { parameters: 'off', body: 1 },
      // Changed arguments from 1 to off.
      CallExpression: { arguments: 'off' },
      ArrayExpression: 1,
      ObjectExpression: 1,
      ImportDeclaration: 1,
      // Changed from false to true.
      flatTernaryExpressions: true,
      ignoreComments: false,
    }],
    '@typescript-eslint/member-delimiter-style': ['error', {
      multiline: { delimiter: 'comma', requireLast: true },
      singleline: { delimiter: 'comma', requireLast: false },
    }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-namespace': 'warn',
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-use-before-define': ['error', {
      classes: true,
      functions: false,
      typedefs: false,
      variables: true,
    }],
    '@typescript-eslint/prefer-for-of': 'warn',
    '@typescript-eslint/prefer-includes': 'warn',
    '@typescript-eslint/prefer-regexp-exec': 'warn',
    '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
    '@typescript-eslint/promise-function-async': ['error', {
      allowAny: true,
    }],
    '@typescript-eslint/semi': ['error', 'never'],
    '@typescript-eslint/strict-boolean-expressions': 'off',
  },
  overrides: [
    {
      files: ['*.test.ts?(x)'],
      rules: {
        // Allow to format arrays for parametrized tests as tables.
        'array-bracket-spacing': 'off',
        'comma-spacing': 'off',
        'object-curly-spacing': 'off',
        'no-multi-spaces': 'off',
        'standard/array-bracket-even-spacing': 'off',
        // Allow spaces inside expect( foo ).
        'space-in-parens': 'off',
        // jest.mock() must be above imports.
        'import/first': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
}
