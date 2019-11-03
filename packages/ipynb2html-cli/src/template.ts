import { $INLINE_FILE } from 'ts-transformer-inline-file'

const notebookCss = $INLINE_FILE('../../ipynb2html/styles/notebook.css')
const pageCss = $INLINE_FILE('./page.css')


export default (contents: string, title: string): string => `\
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="initial-scale=1">
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
${(pageCss + notebookCss).slice(0, -1).replace(/\n\n/g, '\n').replace(/^/gm, '      ')}
    </style>
  </head>
  <body>
${contents}
  </body>
</html>
`
