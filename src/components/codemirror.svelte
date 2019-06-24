<script>
/* global CodeMirror */

import {
  onMount,
  onDestroy,
} from 'svelte';

export let value;
export let height;
export let readOnly = false;

let container;

let cm;
onMount(() => {
  cm = CodeMirror(container, {
    value,
    mode: 'javascript',
    theme: 'monokai',
    lineNumbers: true,
    readOnly: readOnly && 'nocursor',
  });
  cm.on('blur', () => {
    value = cm.getValue();
  });
});

onDestroy(() => {
  cm.toTextArea();
});

$: if (cm && height) {
  cm.setSize('100%', height);
}
</script>

<div bind:this={container} class="codemirror rounded overflow-hidden"></div>
