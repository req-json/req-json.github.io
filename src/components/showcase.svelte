<script>
import Section from './section.svelte';

export let sections = [];
</script>

<div class="shadow-sm p-2 my-4 rounded">
  {#if sections.length}
    {#each sections as section}
      <Section {...section}/>
    {/each}
  {:else}
    <Section {...sections}/>
  {/if}
</div>
