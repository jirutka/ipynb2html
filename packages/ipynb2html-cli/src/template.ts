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
    <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/jsvine/nbpreview@c54381b/css/vendor/notebook.css"
        integrity="sha384-8nb3et+RBCn64rFFK06Oie9mX/D8c59Kg5hha4g9uUehuzCn9DFXGPZ94WYEBb9Z"
        crossorigin="anonymous">
    <style>
      html, body {
        margin: 0;
        padding: 0;
      }
      .nb-notebook {
        width: 99%;
        max-width: 750px;
        margin: 0 auto;
        padding: 3em 6em 1em 6em;
        background-color: white;
      }
    </style>
  </head>
  <body>
${contents}
  </body>
</html>
`
