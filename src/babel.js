let transfrom = code => code;

try {
  (new Function('async()=>{}'))();
} catch (e) {
  import('@babel/standalone')
    .then((babel) => {
      transfrom = code => babel.transform(
        code,
        { presets: ['es2017', 'es2016', 'es2015'] },
      ).code;
    });
}

export default code => transfrom(code);
