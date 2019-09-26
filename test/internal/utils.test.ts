import { callableObject, escapeHTML, identity } from '@/internal/utils'


describe('.callableObject', () => {

  describe('returned value', () => {
    const template = {
      str: 'allons-y!',
      func1: jest.fn().mockReturnValue(1),
      func2: jest.fn().mockReturnValue(2),
    }
    const subject = callableObject('func1', template)

    it('is a function that calls the specified template function', () => {
      expect( subject ).toBeInstanceOf(Function)
      expect( subject('a', 'b') ).toBe(1)
      expect( template.func1 ).toBeCalledWith('a', 'b')
    })

    it('is not the same function as the specified template function', () => {
      expect( subject ).not.toBe(template.func1)
    })

    it('has all enumerable properties of the given template', () => {
      expect( subject.str ).toBe(template.str)
      expect( subject.func1 ).toBe(template.func1)
      expect( subject.func2 ).toBe(template.func2)
    })
  })
})


describe('.escapeHTML', () => {
  test.each([
    /* input         | expected                              */
    ['&'             , '&amp;'                               ],
    ['<'             , '&lt;'                                ],
    ['>'             , '&gt;'                                ],
    ['Hey >_<! <<&>>', 'Hey &gt;_&lt;! &lt;&lt;&amp;&gt;&gt;'],
  ])('"%s" -> "%s"', (input, expected) => {
    expect( escapeHTML(input) ).toEqual(expected)
  })
})


describe('.identity', () => {
  it('returns the first given argument', () => {
    expect( identity('a', 'b') ).toBe('a')
  })
})
