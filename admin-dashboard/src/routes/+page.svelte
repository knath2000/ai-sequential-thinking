<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { fetchJson, connectSSE } from '../lib/api'
  import type { DashboardMetrics } from '../lib/types'
  import Tile from '../lib/components/Tile.svelte'

  let metrics: DashboardMetrics | null = null
  let error: string | null = null
  let es: EventSource | null = null

  async function loadSnapshot() {
    try {
      metrics = await fetchJson<DashboardMetrics>('/analytics/dashboard')
    } catch (e) {
      error = (e as Error).message
    }
  }

  onMount(() => {
    loadSnapshot()
    try {
      es = connectSSE('/analytics/stream', (ev) => {
        try {
          const parsed = JSON.parse(ev.data)
          if (parsed?.timestamp) {
            metrics = parsed as DashboardMetrics
          }
        } catch {}
      })
    } catch (e) {
      console.warn('SSE unavailable, falling back to polling')
      const id = setInterval(loadSnapshot, 5000)
      onDestroy(() => clearInterval(id))
    }
  })

  onDestroy(() => {
    es?.close()
  })
</script>

<div class="min-h-screen bg-gray-900 text-gray-100">
  <div class="mx-auto max-w-7xl p-6">
    <h1 class="text-2xl font-semibold mb-6">Overview</h1>

    {#if error}
      <div class="p-3 rounded bg-red-900/40 border border-red-700">{error}</div>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Tile title="Requests / min" value={metrics?.requests_per_minute} />
      <Tile title="Avg response (ms)" value={metrics?.average_response_time} />
      <Tile title="Success rate (%)" value={metrics?.success_rate} />
      <Tile title="Active sessions" value={metrics?.active_sessions} />
      <Tile title="Cost today (USD)" value={metrics?.total_cost_today} />
      <Tile title="Top errors" value={metrics?.top_errors?.[0] ?? '-'} />
    </div>
  </div>
</div>


