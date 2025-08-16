<script lang="ts">
  import { onMount } from 'svelte'
  import { API_BASE_URL } from '../config'

  type SessionRow = {
    id: number
    session_id: string
    created_at: string
    updated_at?: string
    ended_at?: string
    total_requests: number
    total_errors: number
    total_processing_time_ms: number
  }

  export let pageSize = 20
  let rows: SessionRow[] = []
  let error: string | null = null

  async function load() {
    try {
      const q = new URLSearchParams()
      q.set('limit', String(pageSize))
      const r = await fetch(`${API_BASE_URL}/analytics/sessions?${q.toString()}`, { credentials: 'include' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      rows = await r.json()
      error = null
    } catch (e) {
      error = (e as Error).message
    }
  }

  onMount(() => { load() })
</script>

<div class="rounded-lg border border-gray-700 bg-gray-900/60">
  <div class="flex items-center justify-between px-3 py-2 border-b border-gray-700">
    <div class="text-sm font-semibold">Recent Sessions</div>
    <button class="text-xs text-blue-400 hover:underline" on:click={load}>Refresh</button>
  </div>
  {#if error}
    <div class="p-3 text-red-400 text-sm">{error}</div>
  {/if}
  <div class="overflow-auto">
    <table class="min-w-full text-left text-xs">
      <thead class="bg-gray-800 text-gray-300">
        <tr>
          <th class="px-3 py-2">Session</th>
          <th class="px-3 py-2">Created</th>
          <th class="px-3 py-2">Requests</th>
          <th class="px-3 py-2">Errors</th>
          <th class="px-3 py-2">Proc (ms)</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as s}
          <tr class="border-t border-gray-800 hover:bg-gray-800/40">
            <td class="px-3 py-2 font-mono">{s.session_id}</td>
            <td class="px-3 py-2">{new Date(s.created_at).toLocaleString()}</td>
            <td class="px-3 py-2">{s.total_requests}</td>
            <td class="px-3 py-2">{s.total_errors}</td>
            <td class="px-3 py-2">{s.total_processing_time_ms}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>


