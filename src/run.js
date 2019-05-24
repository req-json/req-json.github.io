/* global loadScripts Babel */

let transfrom = c => c;

export default function run(code, console) {
  try {
    (new Function(
      'console',
      transfrom(code),
    ))(console);
  } catch (e) {
    if (typeof Babel === 'undefined') {
      loadScripts('https://cdn.jsdelivr.net/gh/req-json/req-json.github.io@v0.0.1/public/babel.js')
        .then(() => {
          transfrom = c => Babel.transform(
            c,
            { presets: ['es2015', 'es2016', 'es2017'] },
          ).code;
          run(code, console);
        });
    } else {
      console.error(`${e.name}: ${e.message}`);
    }
  }
}
