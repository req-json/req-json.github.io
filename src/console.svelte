<script>
/* global zenscroll */
import ts from 'time-stamp';
import Fa from 'svelte-fa';
import {
  faChevronCircleRight,
  faInfoCircle,
  faExclamationCircle,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';
import {
  onMount,
  tick,
} from 'svelte';

export let log;

const colors = {
  log: 'secondary',
  info: 'info',
  warn: 'warning',
  error: 'danger',
};
const icons = {
  log: faChevronCircleRight,
  info: faInfoCircle,
  warn: faExclamationCircle,
  error: faTimesCircle,
};

let scroll;
let ul;
const li = [];
let logs = [];

function scrollToLog(i) {
  tick().then(() => {
    scroll.intoView(li[i]);
  });
}

$: if (log) {
  logs = logs.concat({
    t: ts('HH:mm:ss.ms'),
    level: log.level,
    str: log.args.map(l => (typeof l === 'string' ? l : JSON.stringify(l, null, 2))).join(' '),
    collapse: true,
  });
  log = undefined;
  scrollToLog(logs.length - 1);
}

onMount(() => {
  scroll = zenscroll.createScroller(ul);
});
</script>

<ul
  bind:this={ul}
  class="list-group list-group-flush overflow-auto">
  {#each logs as log, i (log.t)}
    <li
      bind:this={li[i]}
      class={`list-group-item p-1 text-${colors[log.level]}`}
      on:click={() => scrollToLog(i, log.collapse = !log.collapse)}>
      <small>
        <Fa icon={icons[log.level]} rotate={log.collapse ? 0 : 90}></Fa>
      </small>
      {log.t}
      {#if log.collapse}
        {log.str}
      {:else}
        <pre>{log.str}</pre>
      {/if}
    </li>
  {/each}
</ul>

<style>
ul {
  position: relative;
  max-height: 160px;
}

li {
  cursor: pointer;
}
</style>
