/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['<rootDir>/test/templates/*.test.js'],
  rootDir: '..',
};
