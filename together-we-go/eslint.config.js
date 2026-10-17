// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

const node = ['require', 'module', 'exports', 'process', 'Buffer', '__dirname', 'console', 'setTimeout', 'clearTimeout', 'URL', 'fetch', 'document', 'window', 'localStorage', 'Image', 'btoa', 'XMLSerializer', 'getComputedStyle'];
const jest = ['describe', 'it', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'jest'];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "e2e/.dist/**", "e2e/shots/**", "server/data/**"],
  },
  {
    // the sync server, the browser tests and the helper scripts are plain Node (CommonJS), not part of the app bundle
    files: ["server/**/*.js", "e2e/**/*.js", "scripts/**/*.js", "jest.config.js", "jest.setup.js"],
    languageOptions: {
      sourceType: 'commonjs',
      globals: Object.fromEntries([...node, ...jest].map((name) => [name, 'readonly'])),
    },
  },
]);
