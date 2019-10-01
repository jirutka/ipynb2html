const pkg = require('./package.json')

module.exports = {
  ...require('../../jest.config.base'),
  name: pkg.name,
  displayName: pkg.name,
}
