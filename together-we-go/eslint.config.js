// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

const node = ['require', 'module', 'process', 'Buffer', '__dirname', 'console', 'setTimeout', 'clearTimeout', 'URL', 'fetch'];
const jest = ['describe', 'it', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'jest'];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // the sync server is plain Node (CommonJS), not part of the app bundle
    files: ["server/**/*.js", "jest.config.js", "jest.setup.js"],
    languageOptions: {
      sourceType: 'commonjs',
      globals: Object.fromEntries([...node, ...jest].map((name) => [name, 'readonly'])),
    },
  },
]);
