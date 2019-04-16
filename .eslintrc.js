module.exports = {
  env: {
    node: true,
    commonjs: true,
    es6: true,
    mocha: true
  },
  extends: 'standard',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {}
}
