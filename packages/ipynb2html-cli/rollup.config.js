import addGitMsg from 'rollup-plugin-add-git-msg'
import builtins from 'builtins'
import commonjs from '@rollup/plugin-commonjs'
import executable from 'rollup-plugin-executable'
import license from 'rollup-plugin-node-license'
import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript2'
import ttypescript from 'ttypescript'

import pkg from './package.json'


export default {
  input: 'src/index.ts',
  plugins: [
    // Transpile TypeScript sources to JS.
    typescript({
      typescript: ttypescript,
      tsconfigOverride: {
        compilerOptions: {
          module: 'ESNext',
          declaration: false,
          declarationMap: false,
          composite: false,
          incremental: true,
        },
      },
      clean: true,
    }),
    // Resolve node modules.
    resolve({
      extensions: ['.mjs', '.js', '.ts'],
      mainFields: ['jsnext:main', 'module', 'main'],
    }),
    // Convert CommonJS modules to ES6 modules.
    commonjs(),
    // Add git tag, commit SHA and build date at top of the file.
    addGitMsg({
      copyright: [
        pkg.author,
        '* This project is licensed under the terms of the MIT license.'
      ].join('\n'),
    }),
    // Generate table of the bundled packages at top of the file.
    license({ format: 'table' }),
    // Minify JS.
    terser({
      ecma: 2018,
      output: {
      // Preserve comment injected by addGitMsg and license.
      comments: RegExp(`(?:\\$\\{${pkg.name}\\}|Bundled npm packages)`),
      },
    }),
    // Make the output file executable.
    executable(),
  ],
  // Don't bundle Node's builtins.
  external: builtins({ version: '*' }),
  output: {
    file: 'dist/ipynb2html',
    format: 'cjs',
    banner: '#!/usr/bin/env node',
    exports: 'named',
    sourcemap: true,
  },
}
