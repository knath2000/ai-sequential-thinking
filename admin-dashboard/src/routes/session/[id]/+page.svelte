<script lang="ts">
  import { page } from '$app/stores'
  import { API_BASE_URL } from '../../../lib/config'
  import { onMount } from 'svelte'

  let sessionId = ''
  let loading = true
  let error: string | null = null
  let detail: any = null

  async function load() {
    try {
      const id = $page.params.id
      sessionId = id
      const r = await fetch(`${API_BASE_URL}/analytics/sessions/${encodeURIComponent(id)}`, { credentials: 'include' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      detail = await r.json()
      error = null
    } catch (e) {
      error = (e as Error).message
    } finally {
      loading = false
    }
  }

  onMount(load)
</script>

<div class="min-h-screen bg-gray-900 text-gray-100">
  <div class="mx-auto max-w-6xl p-6">
    <a href="/dashboard" class="text-sm text-blue-400 hover:underline">← Back</a>
    <h1 class="text-2xl font-semibold mt-2">Session {sessionId}</h1>
    {#if loading}
      <div class="mt-4 text-sm text-gray-400">Loading…</div>
    {:else if error}
      <div class="mt-4 text-sm text-red-400">{error}</div>
    {:else}
      <div class="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-1 rounded border border-gray-700 p-3 bg-gray-900/60">
          <div class="text-sm font-semibold mb-2">Summary</div>
          <div class="text-xs space-y-1">
            <div><span class="text-gray-400">Created:</span> {new Date(detail.session.created_at).toLocaleString()}</div>
            <div><span class="text-gray-400">Requests:</span> {detail.session.total_requests}</div>
            <div><span class="text-gray-400">Errors:</span> {detail.session.total_errors}</div>
            <div><span class="text-gray-400">Proc (ms):</span> {detail.session.total_processing_time_ms}</div>
          </div>
        </div>
        <div class="lg:col-span-2 rounded border border-gray-700 p-3 bg-gray-900/60">
          <div class="text-sm font-semibold mb-2">Recent Events</div>
          <div class="overflow-auto">
            <table class="min-w-full text-left text-xs">
              <thead class="bg-gray-800 text-gray-300">
                <tr>
                  <th class="px-3 py-2">Time</th>
                  <th class="px-3 py-2">Type</th>
                  <th class="px-3 py-2">Tool</th>
                  <th class="px-3 py-2">Resp (ms)</th>
                  <th class="px-3 py-2">Success</th>
                </tr>
              </thead>
              <tbody>
                {#each detail.events as e}
                  <tr class="border-t border-gray-800">
                    <td class="px-3 py-2">{new Date(e.timestamp).toLocaleString()}</td>
                    <td class="px-3 py-2">{e.event_type}</td>
                    <td class="px-3 py-2">{e.tool_name}</td>
                    <td class="px-3 py-2">{e.response_time_ms ?? '-'}</td>
                    <td class="px-3 py-2">{e.success ? 'Yes' : 'No'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>


