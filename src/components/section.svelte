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
export let height = 320;

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

{#if title}
  <h3 id={title.toLowerCase().replace(/ /g, '-')} class="p-1 pt-3">
    {title}
    <a href={`#${title.toLowerCase().replace(/ /g, '-')}`}><Fa icon={faLink} class="link" size="xs"/></a>
  </h3>
{/if}
{#if description}
  <div class="px-1 py-2 rounded">{@html description}</div>
{/if}
{#if code}
<div class="row mx-0 mb-2">
  <div class:col-sm-12={!mock} class="col-sm-6 px-1">
    {#if mock}
      <h5><a href="https://github.com/cweili/req-json#readme" target="_blank">ReqJSON</a></h5>
    {/if}
    <Codemirror bind:value={code} {height} readOnly={!mock}></Codemirror>
  </div>
  {#if mock}
    <div class="col-sm-6 px-1">
      <h5><a href="https://github.com/jameslnewell/xhr-mock#readme" target="_blank">XHRMock</a></h5>
      <Codemirror bind:value={mock} {height} {height} readOnly={!mock}></Codemirror>
    </div>
  {/if}
</div>
{/if}
{#if mock}
  <div class="text-right px-1 py-2">
    <button class="btn btn-outline-secondary btn-sm" on:click={() => clear++}>
      <Fa icon={faTimesCircle}/> CLEAR
    </button>
    <button class="btn btn-outline-primary btn-sm" on:click={run}>
      RUN CODE <Fa icon={faChevronCircleRight}/>
    </button>
  </div>
  <Console {log} {clear}></Console>
{/if}

<style>
h3 :global(.link) {
  display: none;
}

h3:hover :global(.link) {
  display: inline;
}
</style>
