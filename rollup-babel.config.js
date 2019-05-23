/* eslint-disable import/no-extraneous-dependencies */

import buble from 'rollup-plugin-buble';
import { uglify } from 'rollup-plugin-uglify';

export default {
  input: 'node_modules/@babel/standalone/babel.js',
  output: {
    format: 'iife',
    name: 'babel',
    file: 'public/babel.js',
  },
  plugins: [
    buble(),
    uglify(),
  ],
};
