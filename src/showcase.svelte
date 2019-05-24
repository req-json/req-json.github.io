<script>
import Codemirror from './codemirror.svelte';
import Console from './console.svelte';

import runCode from './run';

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
function run() {
  runCode(`XHRMock.reset();${LF}${mock}${LF};(async()=>{${LF}${code}${LF}})().catch(e=>console.error(e.name+': '+e.message))`, cons);
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
