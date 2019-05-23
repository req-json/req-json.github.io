<script>
/* global CodeMirror */

import {
  onMount,
  onDestroy,
  tick,
} from 'svelte';

export let value;

let container;

let cm;
onMount(() => {
  tick().then(() => {
    cm = CodeMirror(container, {
      value,
      mode: 'javascript',
      lineNumbers: true,
      theme: 'monokai',
    });
    cm.on('blur', () => {
      value = cm.getValue();
    });
  });
});

onDestroy(() => {
  cm.toTextArea();
});
</script>

<div bind:this={container} class="codemirror rounded overflow-hidden"></div>

<style>
.codemirror .CodeMirror {
  height: 200px;
}
</style>
