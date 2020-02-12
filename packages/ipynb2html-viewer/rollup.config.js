import addGitMsg from 'rollup-plugin-add-git-msg'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import conditional from 'rollup-plugin-conditional'
import html from '@rollup/plugin-html'
import license from 'rollup-plugin-node-license'
import livereload from 'rollup-plugin-livereload'
import postcss from 'rollup-plugin-postcss'
import resolve from '@rollup/plugin-node-resolve'
import serve from 'rollup-plugin-serve'
import { terser } from 'rollup-plugin-terser'
import ttypescript from 'ttypescript'
import typescript from 'rollup-plugin-typescript2'

import indexTemplate from './index-html'
import pkg from './package.json'


const isProductionBuild = process.env.NODE_ENV === 'production'
const isWatchBuild = !!process.env.ROLLUP_WATCH
const destDir = './dist'
const extensions = ['.mjs', '.js', '.ts']


export default {
  input: 'src/index.ts',
  plugins: [
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
    // Convert PostCSS styles to CSS.
    postcss({
      autoModules: false,
      extract: true,
      sourceMap: true,
      minimize: isProductionBuild,
    }),
    // Generate index.html from the template.
    html({
      template: indexTemplate,
    }),
    conditional(!isWatchBuild, [
      // Add git tag, commit SHA and build date at top of the file.
      addGitMsg({
        copyright: [
          pkg.author,
          '* This project is licensed under the terms of the MIT license.'
        ].join('\n'),
      }),
      // Generate table of the bundled packages at top of the file.
      license({ format: 'table' }),
    ]),
    conditional(isProductionBuild, [
      // Minify JS.
      terser({
        ecma: 5,
        output: {
          // Preserve comment injected by addGitMsg and license.
          comments: RegExp(`(?:\\$\\{${pkg.name}\\}|Bundled npm packages)`),
        },
      }),
    ]),
    // Use only when running in watch mode...
    conditional(isWatchBuild, () => [
      serve({
        contentBase: destDir,
      }),
      livereload(),
    ]),
  ],
  external: [
    'ipynb2html',
  ],
  output: {
    dir: destDir,
    entryFileNames: `ipynb-viewer${isProductionBuild ? '.min' : ''}.js`,
    assetFileNames: `ipynb-viewer${isProductionBuild ? '.min' : ''}.[ext]`,
    format: 'umd',
    name: 'init',
    sourcemap: true,
    globals: {
      ipynb2html: 'ipynb2html',
    },
  },
}
