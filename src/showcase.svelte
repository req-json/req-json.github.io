<script>
/* global loadScripts Babel */
import Codemirror from './codemirror.svelte';
import Console from './console.svelte';

export let title;
export let description;
export let code;
export let mock;

let log;
const cons = {};
for (const level in console) {
  cons[level] = (...args) => {
    log = {
      level,
      args,
    };
  };
}

const LF = '\n\n\n\n\n';
let transfrom = c => c;

function run() {
  try {
    (new Function(
      'console',
      transfrom(`XHRMock.reset();${LF}${mock}${LF};(async()=>{${LF}${code}${LF}})().catch(e=>console.error(e.name+': '+e.message))`),
    ))(cons);
  } catch (e) {
    if (typeof Babel === 'undefined') {
      loadScripts('https://cdn.jsdelivr.net/gh/req-json/req-json.github.io@v0.0.1/public/babel.js')
        .then(() => {
          transfrom = c => Babel.transform(
            c,
            { presets: ['es2015', 'es2016', 'es2017'] },
          ).code;
          run();
        });
    } else {
      cons.error(e.name, e.message);
    }
  }
}
</script>

<div class="shadow-sm p-2 my-4 rounded">
  <h3 class="p-1">{title}</h3>
  {#if description}
    <div class="px-1 py-2 rounded">{description}</div>
  {/if}
  <div class="row m-0">
    <div class="col-sm-6 px-1">
      <h5><a href="https://github.com/cweili/req-json#readme" target="_blank">ReqJSON</a></h5>
      <Codemirror bind:value={code}></Codemirror>
    </div>
    <div class="col-sm-6 px-1">
      <h5><a href="https://github.com/jameslnewell/xhr-mock#readme" target="_blank">XHRMock</a></h5>
      <Codemirror bind:value={mock}></Codemirror>
    </div>
  </div>
  <div class="text-right px-1 py-2">
    <button class="btn btn-outline-primary btn-sm" on:click={run}>RUN</button>
  </div>
  <Console {log}></Console>
</div>
