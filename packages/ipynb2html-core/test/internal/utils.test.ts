import { CallableInstance, escapeHTML, identity } from '@/internal/utils'


describe('CallableInstance', () => {

  class FixtureCallable extends CallableInstance<FixtureCallable> {
    readonly salutation: string

    constructor (salutation: string) {
      super()
      this.salutation = salutation
    }

    __call__ (name: string) {
      return this.salute(name)
    }

    salute (name: string) {
      return `${this.salutation}, ${name}!`
    }
  }

  describe('subclass', () => {
    it('can be instantiated using new', () => {
      expect(() => new FixtureCallable('Hello') ).not.toThrow()
    })
  })

  describe('subclass instance', () => {
    let instance: FixtureCallable

    beforeEach(() => {
      instance = new FixtureCallable('Hello')
    })

    it('is an instance of its class', () => {
      expect( instance ).toBeInstanceOf(FixtureCallable)
      expect( instance.salutation ).toBe('Hello')
      expect( instance.salute('world') ).toBe('Hello, world!')
    })

    it('is an instance of Function', () => {
      expect( instance ).toBeInstanceOf(Function)
    })

    it('is a typeof function', () => {
      expect( typeof instance ).toBe('function')
    })

    it('has function property "name" that equals the class name', () => {
      expect( instance.name ).toBe('FixtureCallable')
    })

    it('has function property "length" that equals number of arguments of the __call__ method', () => {
      expect( instance.length ).toBe(1)
    })

    it('can be called, redirects to the method __call__', () => {
      expect( instance('world') ).toBe('Hello, world!')
      expect( instance.apply(null, ['world']) ).toBe('Hello, world!')  // eslint-disable-line no-useless-call
      expect( instance.call(null, 'world') ).toBe('Hello, world!')  // eslint-disable-line no-useless-call
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
