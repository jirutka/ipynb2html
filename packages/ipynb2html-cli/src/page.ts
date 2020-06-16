import { version } from 'ipynb2html'


export type Options = {
  contents: string,
  title: string,
  style: string,
}

export default ({ contents, title, style }: Options): string => `\
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="initial-scale=1">
    <meta name="generator" content="ipynb2html ${version}">
    <title>${title}</title>
    <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@10.1.1/build/styles/default.min.css"
        integrity="sha384-s4RLYRjGGbVqKOyMGGwfxUTMOO6D7r2eom7hWZQ6BjK2Df4ZyfzLXEkonSm0KLIQ"
        crossorigin="anonymous">
    <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.11.0/dist/katex.min.css"
        integrity="sha384-BdGj8xC2eZkQaxoQ8nSLefg4AV4/AwB3Fj+8SUSo7pnKP6Eoy18liIKTPn9oBYNG"
        crossorigin="anonymous">
    <style>
${style.replace(/\n\n/g, '\n').replace(/\n$/, '').replace(/^/gm, '      ')}
    </style>
  </head>
  <body>
${contents}
  </body>
</html>
`
