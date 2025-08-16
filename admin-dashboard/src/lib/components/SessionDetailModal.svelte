<script lang="ts">
  import { fade } from 'svelte/transition'
  import type { SessionResponse, UsageEventResponse, PerformanceMetricResponse, ErrorLogResponse } from '../../types'

  export let sessionDetail: any = null
  export let onClose: () => void = () => {}
</script>

{#if sessionDetail}
  <div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center" transition:fade>
    <div class="modal-content bg-white dark:bg-gray-900 rounded-lg shadow-lg w-11/12 max-w-3xl p-4" on:click|stopPropagation>
      <button class="close-button absolute top-3 right-3 text-gray-600" on:click={onClose}>×</button>
      <h2 class="text-lg font-semibold mb-2">Session {sessionDetail.session.session_id}</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 class="text-sm font-medium">Metadata</h3>
          <pre class="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2">{JSON.stringify(sessionDetail.session, null, 2)}</pre>
        </div>
        <div>
          <h3 class="text-sm font-medium">Metrics (latest)</h3>
          <div class="mt-2 max-h-40 overflow-auto text-xs">
            {#if sessionDetail.metrics.length === 0}
              <div class="text-gray-500">No metrics</div>
            {:else}
              <ul>
                {#each sessionDetail.metrics as m}
                  <li class="py-1">{m.metric_name}: {m.metric_value} {m.metric_unit || ''}</li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>
      </div>

      <div class="mt-4">
        <h3 class="text-sm font-medium">Recent Events</h3>
        <div class="mt-2 max-h-48 overflow-auto text-xs font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
          {#if sessionDetail.events.length === 0}
            <div class="text-gray-500">No events</div>
          {:else}
            <ul>
              {#each sessionDetail.events as e}
                <li class="py-1">{new Date(e.timestamp).toLocaleString()} — {e.event_type} — {e.tool_name || ''} — {e.response_time_ms ?? '-'}ms</li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>

      <div class="mt-4">
        <h3 class="text-sm font-medium">Error Logs</h3>
        <div class="mt-2 max-h-48 overflow-auto text-xs font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
          {#if sessionDetail.logs.length === 0}
            <div class="text-gray-500">No logs</div>
          {:else}
            <ul>
              {#each sessionDetail.logs as l}
                <li class="py-1">{new Date(l.timestamp).toLocaleString()} [{l.level}] — {l.error_type}: {l.error_message}</li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .close-button { font-size: 1.25rem }
</style>
