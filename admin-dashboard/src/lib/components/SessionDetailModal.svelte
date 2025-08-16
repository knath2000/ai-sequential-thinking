<script lang="ts">
  import { fade } from 'svelte/transition'
  import { onMount, onDestroy } from 'svelte'
  import type { SessionDetailResponse } from '../../types'

  export let sessionDetail: SessionDetailResponse | null = null
  export let onClose: () => void = () => {}

  let inactivityTimeout: ReturnType<typeof setTimeout>
  const INACTIVITY_DURATION = 5 * 60 * 1000 // 5 minutes

  function resetInactivityTimer() {
    clearTimeout(inactivityTimeout)
    inactivityTimeout = setTimeout(() => {
      onClose()
    }, INACTIVITY_DURATION)
  }

  function handleActivity() {
    resetInactivityTimer()
  }

  onMount(() => {
    resetInactivityTimer()
    
    // Add event listeners for user activity
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    return () => {
      clearTimeout(inactivityTimeout)
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  })
</script>

{#if sessionDetail}
  <div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50" transition:fade>
    <div class="modal-content bg-white dark:bg-gray-900 rounded-lg shadow-lg w-11/12 max-w-3xl p-4 max-h-[90vh] overflow-auto" on:click|stopPropagation>
      <button class="close-button absolute top-3 right-3 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" on:click={onClose}>×</button>
      
      <h2 class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Session {sessionDetail.session.session_id}</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Metadata</h3>
          <pre class="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 overflow-auto max-h-32">{JSON.stringify(sessionDetail.session, null, 2)}</pre>
        </div>
        
        <div>
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Metrics ({sessionDetail.metrics.length})</h3>
          <div class="mt-2 max-h-32 overflow-auto text-xs">
            {#if sessionDetail.metrics.length === 0}
              <div class="text-gray-500">No metrics</div>
            {:else}
              <ul class="space-y-1">
                {#each sessionDetail.metrics as m}
                  <li class="py-1">{m.metric_name}: {m.metric_value} {m.metric_unit || ''}</li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>
      </div>

      <div class="mb-4">
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Events ({sessionDetail.events.length})</h3>
        <div class="mt-2 max-h-48 overflow-auto text-xs font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
          {#if sessionDetail.events.length === 0}
            <div class="text-gray-500">No events</div>
          {:else}
            <ul class="space-y-1">
              {#each sessionDetail.events as e}
                <li class="py-1">
                  {new Date(e.timestamp).toLocaleString()} — {e.event_type} — {e.tool_name || ''} — {e.response_time_ms ?? '-'}ms
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>

      <div>
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Error Logs ({sessionDetail.logs.length})</h3>
        <div class="mt-2 max-h-48 overflow-auto text-xs font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
          {#if sessionDetail.logs.length === 0}
            <div class="text-gray-500">No logs</div>
          {:else}
            <ul class="space-y-1">
              {#each sessionDetail.logs as l}
                <li class="py-1">
                  {new Date(l.timestamp).toLocaleString()} [{l.level}] — {l.error_type}: {l.error_message}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .close-button {
    font-size: 1.25rem;
    cursor: pointer;
  }
</style>
