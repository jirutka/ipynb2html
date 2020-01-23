import addGitMsg from 'rollup-plugin-add-git-msg'
import babel from 'rollup-plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import license from 'rollup-plugin-node-license'
import resolve from 'rollup-plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import ttypescript from 'ttypescript'
import typescript from 'rollup-plugin-typescript2'

import pkg from './package.json'


const extensions = ['.mjs', '.js', '.ts']

const globals = {
  anser: 'anser',
  highlightjs: 'hljs',
  katex: 'katex',
  marked: 'marked',
}

const plugins = [
  // Transpile TypeScript sources to JS.
  typescript({
    typescript: ttypescript,
    tsconfigOverride: {
      compilerOptions: {
        target: 'ES5',
        module: 'ESNext',
        declaration: false,
        declarationMap: false,
        composite: false,
        incremental: true,
      },
    },
    // This is needed for node-license plugin. :(
    // https://github.com/ezolenko/rollup-plugin-typescript2#plugins-using-asyncawait
    objectHashIgnoreUnknownHack: true,
    clean: true,
  }),
  // Resolve node modules.
  resolve({
    extensions,
    mainFields: ['browser', 'module', 'main'],
  }),
  // Convert CommonJS modules to ES6 modules.
  commonjs(),
  // Transpile all sources for older browsers and inject needed polyfills.
  babel({
    babelrc: false,
    // To avoid Babel injecting core-js polyfills into core-js.
    exclude: [/node_modules\/core-js\//],
    extensions,
    presets: [
      [
        '@babel/env', {
          corejs: 3,
          debug: false,
          modules: false,
          useBuiltIns: 'usage',  // inject polyfills
          // targets: reads from "browserslist" in package.json
        },
      ],
    ],
  }),
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
    ecma: 5,
    include: [/^.+\.min\.js$/],
    output: {
      // Preserve comment injected by addGitMsg and license.
      comments: RegExp(`(?:\\$\\{${pkg.name}\\}|Bundled npm packages)`),
    },
  }),
]

const output = (filename, extra = {}) => ['.js', '.min.js'].map(ext => ({
  name: pkg.name,
  file: `${filename}${ext}`,
  format: 'umd',
  sourcemap: true,
  ...extra,
}))

export default [
  // Bundle third-party dependencies except core-js polyfills.
  {
    input: 'src/browser.ts',
    external: Object.keys(globals),
    plugins,
    output: output(`dist/${pkg.name}`, { globals }),
  },
  // Bundle with all dependencies.
  {
    input: 'src/browser.ts',
    plugins,
    // Tree-shaking breaks KaTeX and has almost zero effect on the bundle size.
    treeshake: false,
    output: output(`dist/${pkg.name}-full`),
  }
]
