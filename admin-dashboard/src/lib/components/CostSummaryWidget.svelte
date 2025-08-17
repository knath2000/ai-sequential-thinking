<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchJson } from '../api';

  type CostSummary = {
    total_cost_usd: number;
    total_tokens: number;
    total_requests: number;
  };

  let data: CostSummary | null = null;
  let error: string | null = null;
  let loading = true;

  function formatCurrency(n: number) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
    } catch {
      return `$${n.toFixed(2)}`;
    }
  }

  onMount(async () => {
    loading = true;
    error = null;
    try {
      data = await fetchJson<CostSummary>('/analytics/costs/summary');
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  });
</script>

<div class="glass rounded-xl p-4">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-sm text-gray-400">Cost Summary</div>
      <div class="mt-1 text-lg font-semibold">Overview (period)</div>
    </div>
  </div>

  {#if loading}
    <div class="mt-4 text-sm text-gray-400">Loading…</div>
  {:else if error}
    <div class="mt-4 text-sm text-red-400">Error: {error}</div>
  {:else}
    <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-3 bg-gray-800/40 rounded">
        <div class="text-xs text-gray-400">Total Cost (USD)</div>
        <div class="mt-1 text-2xl font-semibold">{formatCurrency(data?.total_cost_usd ?? 0)}</div>
      </div>
      <div class="p-3 bg-gray-800/40 rounded">
        <div class="text-xs text-gray-400">Total Tokens</div>
        <div class="mt-1 text-2xl font-semibold">{data?.total_tokens ?? 0}</div>
      </div>
      <div class="p-3 bg-gray-800/40 rounded">
        <div class="text-xs text-gray-400">Total Requests</div>
        <div class="mt-1 text-2xl font-semibold">{data?.total_requests ?? 0}</div>
      </div>
    </div>
  {/if}
</div>


