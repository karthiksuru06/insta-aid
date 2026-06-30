// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Node-runtime backend/tooling files are not part of the Expo app and use a
    // different environment; they're verified via `npm test` / `node --check`.
    ignores: [
      'dist/*',
      'server.mjs',
      'lib/**',
      'scripts/**',
      'tests/**',
      'test_express_hardening.js',
      // Cloud Functions are a separate sub-project with their own build/lint;
      // never lint their compiled output from the Expo app config.
      'functions/**',
    ],
  },
]);
