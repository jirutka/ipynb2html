import dedent from 'dedent'

import { extractMath, restoreMath } from '@/mathExtractor'


describe('.extractMath', () => {

  describe.each([
    /* delimiters   | displayMode */
    ['$...$'        , false],
    ['$$...$$'      , true ],
    ['\\\\(...\\\\)', false],
    ['\\\\[...\\\\]', true ],
  ] as Array<[string, boolean]>)(
    'text with expression delimited using %s', (delimiters, displayMode) => {

      describe('on a single line', () => {
        const value = 'x = 42'
        const raw = delimiters.replace('...', value)

        it('extracts and substitutes math expression in the given text', () => {
          expect(
            extractMath(`Let's define ${raw}.`)
          ).toEqual([`Let's define @@1@@.`, [{ displayMode, raw, value }]])
        })
      })

      describe('on multiple lines', () => {
        const value = 'x = 42\ny = 55'
        const raw = delimiters.replace('...', `\n  ${value}\n`)

        it('extracts and substitutes math expression in the given text', () => {
          expect(
            extractMath(`Let's define ${raw}.`)
          ).toEqual([`Let's define @@1@@.`, [{ displayMode, raw, value }]])
        })
      })
    }
  )

  describe('text with \\begin{..} ... \\end{..} expression', () => {
    const raw = '\\begin{equation}a_{0}+ b_{T}\\end{equation}'

    it('extracts and substitutes math expression in the given text', () => {
      expect(
        extractMath(`Let's define ${raw}.`)
      ).toEqual([`Let's define @@1@@.`, [{ displayMode: true, raw, value: raw }]])
    })
  })

  describe('text with marker-like sequences', () => {

    it('escapes @@[0-9]+@@ as @@0[0-9]+@@', () => {
      expect(
        extractMath('This @@02@@ is not our marker')
      ).toEqual(['This @@002@@ is not our marker', []])
    })
  })

  it('ignores math delimiters inside `inline code`', () => {
    expect(
      extractMath('`$x$` and ``$`x`$`` is a code, $x$ is not')
    ).toEqual([
      '`$x$` and ``$`x`$`` is a code, @@1@@ is not',
      [{ displayMode: false, raw: '$x$', value: 'x' }],
    ])
  })

  it('ignores math delimiters inside ```fenced code blocks```', () => {
    const text = dedent`
      Some code:
      \`\`\`sh
      echo $foo $bar
      \`\`\`
      and $$ x = 42 $$
    `
    expect( extractMath(text) ).toEqual([
      text.replace('$$ x = 42 $$', '@@1@@'),
      [{ displayMode: true, raw: '$$ x = 42 $$', value: 'x = 42' }],
    ])
  })

  test('complex example', () => {
    const eq2 = dedent`
      \begin{aligned}
        A_k &= \langle k, +\infty), &
        B_k &= \{ p \mid p \ \text{is prvočíslo a} \ p < k \}
      \end{aligned}
    `
    const text = dedent`
      Define sets for natural $k$

      \begin{aligned}
        A_k &= \langle k, +\infty), &
        B_k &= \{ p \mid p \ \text{is prvočíslo a} \ p < k \}
      \end{aligned}

      This @@1@@ is not a marker, this \`$x && $y\`
      is not a math, but \\(x\\) and $$
        x = 42
      $$ is.
    `
    const expected = dedent`
      Define sets for natural @@1@@

      @@2@@

      This @@01@@ is not a marker, this \`$x && $y\`
      is not a math, but @@3@@ and @@4@@ is.
    `

    expect( extractMath(text) ).toEqual([expected, [
      { displayMode: false, raw: '$k$', value: 'k' },
      { displayMode: true, raw: eq2, value: eq2 },
      { displayMode: false, raw: '\\\\(x\\\\)', value: 'x' },
      { displayMode: true, raw: '$$\n  x = 42\n$$', value: 'x = 42' },
    ]])
  })
})


describe('.restoreMath', () => {

  it('replaces markers with the given strings', () => {
    const repl = ['first']
    repl[21] = 'second'

    expect(
      restoreMath("Let's define @@1@@ and @@22@@.", repl)
    ).toEqual("Let's define first and second.")
  })

  it('unescapes marker-like sequences', () => {
    expect(
      restoreMath('This @@001@@ is not our marker, nor @@01@@, but @@1@@ is.', ['this one'])
    ).toEqual('This @@01@@ is not our marker, nor @@1@@, but this one is.')
  })
})
