<script>
/* global zenscroll */
import ts from 'time-stamp';
import Fa from 'fa-svelte';
import {
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import {
  onMount,
  tick,
} from 'svelte';

export let log;

const levels = {
  log: 'secondary',
  info: 'info',
  warn: 'warning',
  error: 'danger',
};

let ul;
let scroll;
onMount(() => {
  scroll = zenscroll.createScroller(ul);
});

let logs = [];
function scrollToLog(i) {
  tick().then(() => {
    scroll.center(document.getElementById(`log-${logs[i].t}`));
  });
}
$: if (log) {
  logs = logs.concat({
    t: ts('HH:mm:ss.ms'),
    level: levels[log.level],
    str: log.args.map(l => JSON.stringify(l, null, 2)).join(' '),
    collapse: true,
  });
  log = undefined;
  scrollToLog(logs.length - 1);
}

function collapse(i) {
  logs[i].collapse = !logs[i].collapse;
  scrollToLog(i);
}
</script>

<ul
  bind:this={ul}
  class="list-group list-group-flush overflow-auto">
  {#each logs as log, i (log.t)}
    <li
      id={`log-${log.t}`}
      class:open={!log.collapse}
      class="list-group-item p-1"
      on:click={() => collapse(i)}>
      <small class={`text-${log.level}`}>
        <Fa icon={faChevronRight}></Fa>
      </small>
      <span class={`text-${log.level}`}>{log.t}</span>
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

li.open :global(svg) {
  transform: rotate(90deg);
}
</style>
