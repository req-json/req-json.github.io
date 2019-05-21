<script>
import ts from 'time-stamp';
import Fa from 'fa-svelte';
import {
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import {
  beforeUpdate,
  afterUpdate,
} from 'svelte';

export let log;

const levels = {
  log: 'secondary',
  info: 'info',
  warn: 'warning',
  error: 'danger',
};
let logs = [];
$: log && (logs = logs.concat({
  t: ts('HH:mm:ss.ms'),
  level: levels[log.level],
  str: log.args.map(l => JSON.stringify(l, null, 2)).join(' '),
}));

$: console.log(log);

const height = 160;
let ul;
let autoscroll;
beforeUpdate(() => {
  autoscroll = ul && (ul.offsetHeight + ul.scrollTop) > (ul.scrollHeight - height);
});
afterUpdate(() => {
  autoscroll && ul.scrollTo(0, ul.scrollHeight);
});
</script>

<ul
  bind:this={ul}
  style={`max-height: ${height}px`}
  class="list-group list-group-flush overflow-auto">
  {#each logs as log (log.t)}
    <li class="list-group-item p-1">
      <small class={`text-${log.level}`}><Fa icon={faChevronRight}></Fa></small>
      <span class={`text-${log.level}`}>{log.t}</span>
      {log.str}
    </li>
  {/each}
</ul>
