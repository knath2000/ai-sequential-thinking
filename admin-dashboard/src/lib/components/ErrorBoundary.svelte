<script lang="ts">
  import { onMount } from 'svelte';
  import { analyticsClient } from '../../api';
  
  export let error: Error;
  
  onMount(async () => {
    if (error) {
      await analyticsClient.logError({
        error_type: 'ClientError',
        error_message: error.message,
        stack_trace: error.stack,
        context: { component: 'ErrorBoundary' }
      });
    }
  });
</script>

<div class="error-boundary p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
  <h2 class="font-bold">An unexpected error occurred.</h2>
  <p>Please try refreshing the page or contact support if the issue persists.</p>
  {#if error}
    <pre class="mt-2 p-2 bg-red-50 text-red-800 rounded-sm overflow-auto text-xs">
      Error: {error.message}
      {#if error.stack}
{error.stack}
      {/if}
    </pre>
  {/if}
</div>
