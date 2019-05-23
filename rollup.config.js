import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import buble from 'rollup-plugin-buble';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/index.js',
  output: {
    sourcemap: !production,
    format: 'iife',
    name: 'app',
    file: 'public/index.js',
  },
  plugins: [
    svelte({
      // enable run-time checks when not in production
      dev: !production,
      // we'll extract any component CSS out into
      // a separate file — better for performance
      css: (css) => {
        css.write('public/bundle.css');
      },
      legacy: true,
    }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration —
    // consult the documentation for details:
    // https://github.com/rollup/rollup-plugin-commonjs
    resolve({
      mainFields: ['svelte', 'module', 'main'],
    }),
    commonjs(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    production || livereload('public'),

    // If we're building for production (npm run build
    // instead of npm run dev)
    production && buble(),
  ],
};
