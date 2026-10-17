// Unit tests run with jest-expo so React Native modules are mocked the same way Expo does it.
const preset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // images live in ./assets (like tsconfig's paths), everything else under ./src
  moduleNameMapper: { '^@/assets/(.*)$': '<rootDir>/assets/$1', '^@/(.*)$': '<rootDir>/src/$1' },
  // immer and zustand ship ES modules, so they must go through Babel like the Expo packages do.
  transformIgnorePatterns: [
    preset.transformIgnorePatterns[0].replace('standard-navigation))', 'standard-navigation|immer|zustand|@noble))'),
    ...preset.transformIgnorePatterns.slice(1),
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
