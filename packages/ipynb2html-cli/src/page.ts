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
        href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@9.15.10/build/styles/default.min.css"
        integrity="sha384-ut3ELVx81ErZQaaMTknSmGb0CEGAKoBFTamRcY1ddG4guN0aoga4C+B6B7Kv1Ll1"
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
