module.exports = {
  extends: 'airbnb-base',
  plugins: ['svelte3'],
  env: {
    browser: true
  },
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  rules: {
    'no-loop-func': 0,
    'no-multi-assign': 0,
    'no-new-func': 0,
    'no-param-reassign': 0,
    'no-restricted-syntax': 0,
    'no-underscore-dangle': 0,
    'no-unused-expressions': 0,
    'guard-for-in': 0,
    'import/prefer-default-export': 0,
    'import/no-mutable-exports': 0
  }
};
