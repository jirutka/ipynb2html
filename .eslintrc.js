const tsconfigs = [
  'tsconfig.json',
  '*/tsconfig.json',
  'packages/*/tsconfig.json',
  'packages/*/test/tsconfig.json',
]

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    project: tsconfigs,
  },
  env: {
    es6: true,
    node: true,
  },
  settings: {
    'import/resolver': {
      // Use eslint-import-resolver-typescript to obey "paths" in tsconfig.json.
      typescript: {
        directory: tsconfigs,
      },
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'standard-with-typescript',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    'linebreak-style': ['error', 'unix'],
    // Changed from error to warn and enabled ignoreEOLComments.
    'no-multi-spaces': ['warn', {
      ignoreEOLComments: true,
    }],
    // Changed from error to warn and adjusted options.
    'no-multiple-empty-lines': ['warn', {
      max: 2,
      maxEOF: 1,
      maxBOF: 1,
    }],
    'no-template-curly-in-string': 'off',
    // Changed from 'after' to 'before'.
    'operator-linebreak': ['error', 'before'],
    // Changed from error and all 'never' to warn and switches 'never'.
    'padded-blocks': ['warn', {
      switches: 'never',
    }],
    // Changed from 'as-needed' to 'consistent-as-needed'.
    'quote-props': ['error', 'consistent-as-needed'],

    // Import

    // Some packages have wrong type declarations.
    'import/default': 'off',
    'import/newline-after-import': 'warn',
    // This rule disallows using both wildcard and selective imports from the same module.
    'import/no-duplicates': 'off',
    // Some packages have it wrong in type declarations (e.g. katex, marked).
    'import/no-named-as-default-member': 'off',
    'import/order': ['warn', {
      'groups': [['builtin', 'external']],
      'newlines-between': 'always-and-inside-groups',
    }],

    // TypeScript

    // Changed from error to warn.
    '@typescript-eslint/ban-types': 'warn',
    // Changed from error to off.
    '@typescript-eslint/consistent-type-definitions': 'off',
    // Changed from error to off.
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-member-accessibility': ['warn', {
      accessibility: 'no-public',
      overrides: {
        parameterProperties: 'off',
      },
    }],
    // Changed from warn to error and adjusted options.
    '@typescript-eslint/explicit-module-boundary-types': ['error', {
      allowArgumentsExplicitlyTypedAsAny: true,
    }],
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
    // Changed from error to warn.
    '@typescript-eslint/lines-between-class-members': 'warn',
    '@typescript-eslint/member-delimiter-style': ['error', {
      // Changed delimiter from none to comma.
      multiline: { delimiter: 'comma', requireLast: true },
      singleline: { delimiter: 'comma', requireLast: false },
    }],
    // Changed from warn to off.
    '@typescript-eslint/no-explicit-any': 'off',
    // Changed from error to warn.
    '@typescript-eslint/no-extra-semi': 'warn',
    // Changed from error to warn.
    '@typescript-eslint/no-namespace': 'warn',
    // Changed from error to warn.
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-require-imports': 'error',
    // Changed from error to warn.
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    // Changed from error to warn.
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    // Disabled in favour of the next rule.
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars-experimental': 'error',
    // Changed options.
    '@typescript-eslint/no-use-before-define': ['error', {
      functions: false,
      typedefs: false,
    }],
    '@typescript-eslint/prefer-for-of': 'warn',
    // Changed from error to warn.
    '@typescript-eslint/prefer-includes': 'warn',
    // Changed from error to warn.
    '@typescript-eslint/prefer-regexp-exec': 'warn',
    '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
    // It has too many false positives.
    '@typescript-eslint/restrict-template-expressions': 'off',
    // Changed from error to off.
    '@typescript-eslint/strict-boolean-expressions': 'off',
    // Changed from error to warn and adjusted options.
    '@typescript-eslint/unbound-method': ['warn', {
      ignoreStatic: true,
    }],
  },
  overrides: [
    {
      files: ['*.test.ts?(x)'],
      rules: {
        // Allow to format arrays for parametrized tests as tables.
        'array-bracket-spacing': 'off',
        'comma-dangle': ['error', {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          // Changed to not require comma in a multiline expect().
          functions: 'only-multiline',
        }],
        'object-curly-spacing': 'off',
        'no-multi-spaces': 'off',
        'standard/array-bracket-even-spacing': 'off',
        // Allow spaces inside expect( foo ).
        'space-in-parens': 'off',
        // jest.mock() must be above imports.
        'import/first': 'off',
        '@typescript-eslint/comma-spacing': 'off',
        // False positive on expect() functions.
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'warn',
      },
    },
  ],
}
