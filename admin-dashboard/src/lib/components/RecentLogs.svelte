<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { API_BASE_URL } from '../config'

  export let pollMs = 3000
  export let max = 200
  export let level: string | undefined

  type LogRow = { ts: string; level: string; name: string; message: string }
  let rows: LogRow[] = []
  let error: string | null = null

  async function load() {
    try {
      const q = new URLSearchParams()
      q.set('limit', String(max))
      if (level) q.set('level', level)
      const r = await fetch(`${API_BASE_URL}/analytics/logs?${q.toString()}`, { credentials: 'include' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      rows = await r.json()
      error = null
    } catch (e) {
      error = (e as Error).message
    }
  }

  onMount(() => {
    load()
    const id = setInterval(load, pollMs)
    onDestroy(() => clearInterval(id))
  })
</script>

<div class="rounded-lg border border-gray-700 bg-gray-900/60">
  <div class="flex items-center justify-between px-3 py-2 border-b border-gray-700">
    <div class="text-sm font-semibold">Recent Logs</div>
    <button class="text-xs text-blue-400 hover:underline" on:click={load}>Refresh</button>
  </div>
  {#if error}
    <div class="p-3 text-red-400 text-sm">{error}</div>
  {/if}
  <div class="max-h-64 overflow-auto text-xs">
    {#each rows as r}
      <div class="px-3 py-1 whitespace-pre-wrap">
        <span class="text-gray-500">[{r.ts}]</span>
        <span class="ml-1 font-semibold {r.level === 'ERROR' ? 'text-red-400' : r.level === 'WARNING' ? 'text-yellow-400' : 'text-green-400'}">{r.level}</span>
        <span class="ml-1 text-gray-400">{r.name}</span>
        <span class="ml-2">{r.message}</span>
      </div>
    {/each}
  </div>
</div>


