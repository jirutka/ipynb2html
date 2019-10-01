// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  ...require('./jest.config.base'),

  // Run tests from one or more projects
  projects: [
    '<rootDir>',
    '<rootDir>/packages/*/',
  ],
}
