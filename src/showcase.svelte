<script>
import Fa from 'svelte-fa';
import {
  faChevronCircleRight,
  faTimesCircle,
  faLink,
} from '@fortawesome/free-solid-svg-icons';

import Codemirror from './codemirror.svelte';
import Console from './console.svelte';

import runCode from './run';

export let title = '';
export let description = '';
export let code = '';
export let mock = '';

let clear = 0;
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
  {#if title}
    <h3 id={title.toLowerCase().replace(/ /g, '-')} class="p-1">
      {title}
      <a href={`#${title.toLowerCase().replace(/ /g, '-')}`}><Fa icon={faLink} class="link" size="xs"/></a>
    </h3>
  {/if}
  {#if description}
    <div class="px-1 py-2 rounded">{description}</div>
  {/if}
  <div class="row m-0">
    <div class:col-sm-12={!mock} class="col-sm-6 px-1">
      {#if mock}
        <h5><a href="https://github.com/cweili/req-json#readme" target="_blank">ReqJSON</a></h5>
      {/if}
      <Codemirror bind:value={code}></Codemirror>
    </div>
    {#if mock}
      <div class="col-sm-6 px-1">
        <h5><a href="https://github.com/jameslnewell/xhr-mock#readme" target="_blank">XHRMock</a></h5>
        <Codemirror bind:value={mock}></Codemirror>
      </div>
    {/if}
  </div>
  {#if mock}
    <div class="text-right px-1 py-2">
      <button class="btn btn-outline-secondary btn-sm" on:click={() => clear++}>
        <Fa icon={faTimesCircle}/> CLEAR
      </button>
      <button class="btn btn-outline-primary btn-sm" on:click={run}>
        RUN CODE <Fa icon={faChevronCircleRight}/>
      </button>
    </div>
  {/if}
  <Console {log} {clear}></Console>
</div>

<style>
h3 :global(.link) {
  display: none;
}

h3:hover :global(.link) {
  display: inline;
}
</style>
