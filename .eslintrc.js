module.exports = {
  env: {
    node: true,
    es6: true,
    mocha: true
  },
  extends: 'standard',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    btoa: 'readonly',
    atob: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    'quote-props': ['error', 'as-needed'],
    'space-before-function-paren': ['error', 'always']
  }
}
