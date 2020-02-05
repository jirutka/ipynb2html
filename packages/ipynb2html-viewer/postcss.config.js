module.exports = ({ env }) => ({
  map: {
    inline: false,
  },
  plugins: {
    'postcss-inline-svg': {},
    'postcss-nesting': {},
    'postcss-sort-media-queries': {
      sort: 'desktop-first',
    },
    'cssnano': env === 'production',
  },
})
