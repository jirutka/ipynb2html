export default ({ files: { css: [css], js: [js] }, publicPath }) => `\
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" lang="en">
    <meta name="viewport" content="initial-scale=1">
    <title>.ipynb viewer</title>
    <link
      rel="stylesheet"
      href="${publicPath}${css.fileName}"
      crossorigin="anonymous">
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/ipynb2html@0.2.0/dist/notebook.min.css"
      crossorigin="anonymous">
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.min.css"
      crossorigin="anonymous">
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@9.15.10/build/styles/default.min.css"
      crossorigin="anonymous">
    <script defer src="https://cdn.jsdelivr.net/npm/ipynb2html@0.2.0/dist/ipynb2html-full.min.js" crossorigin="anonymous"></script>
    <script defer src="${publicPath}${js.fileName}" crossorigin="anonymous" onload="init()"></script>
  </head>
  <body>
    <noscript>
      This page needs JavaScript. Enable JavaScript in your browser or use a different browser.
    </noscript>
  </body>
</html>
`
