/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  modulePaths: ['<rootDir>/src', '<rootDir>/test/base'],
  testMatch: ['<rootDir>/test/base/**/*.test.ts'],
  rootDir: '..',
};
