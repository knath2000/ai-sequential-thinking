<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchJson } from '../api'; // Assuming fetchJson is in api.ts

  let pollMs = 3000;
  let max = 200;
  let level: string = ''; // Add default empty string

  type LogRow = { ts: string; level: string; name: string; message: string };
  let rows: LogRow[] = [];
  let error: string | null = null;
  let loading = true; // Add loading state

  async function load() {
    try {
      const q = new URLSearchParams();
      q.set('limit', String(max));
      if (level) q.set('level', level);
      rows = await fetchJson<LogRow[]>(`/analytics/logs?${q.toString()}`);
      error = null;
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false; // Set loading to false after fetch
    }
  }

  onMount(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  });
</script>

<div class="glass-table-container">
  <div class="table-header">
    <h3>Recent Logs</h3>
    <div class="table-actions">
      <button class="glass-button" on:click={load}>
        <span>↻</span> Refresh
      </button>
    </div>
  </div>

  {#if error}
    <div class="p-3 text-red-400 text-sm">{error}</div>
  {:else if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading logs...</span>
    </div>
  {:else}
    <div class="glass-table glass-log-table">
      {#each rows as r}
        <div class="log-row">
          <span class="log-timestamp">[{r.ts.slice(11, 19)}]</span>
          <span class="log-level level-{r.level.toLowerCase()}">{r.level}</span>
          <span class="log-name">{r.name}</span>
          <span class="log-message">{r.message}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .glass-table-container {
    background: var(--glass-primary);
    backdrop-filter: var(--glass-blur-primary);
    border: 1px solid var(--glass-border-light);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: var(--glass-shadow-primary);
    display: flex; /* Use flexbox for layout */
    flex-direction: column;
    height: 100%; /* Ensure it takes full height in grid */
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--glass-border-light);
    background: rgba(255, 255, 255, 0.05);
    flex-shrink: 0; /* Prevent header from shrinking */
  }

  .table-header h3 {
    color: var(--text-primary);
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }

  .glass-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--glass-secondary);
    backdrop-filter: var(--glass-blur-subtle);
    border: 1px solid var(--glass-border-light);
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 14px;
    cursor: pointer;
    transition: all var(--glass-transition-fast);
  }

  .glass-button:hover {
    background: rgba(255, 255, 255, 0.15);
    color: var(--text-primary);
    transform: translateY(-1px);
  }

  .glass-log-table {
    overflow-y: auto; /* Enable vertical scrolling for logs */
    flex-grow: 1; /* Allow logs section to grow */
    padding: 16px 24px; /* Add padding to log content */
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
    font-size: 12px;
  }

  .log-row {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
    line-height: 1.4;
    color: var(--text-secondary);
  }

  .log-timestamp {
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  .log-level {
    font-weight: 600;
    flex-shrink: 0;
  }
  
  .log-name {
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  .log-message {
    flex-grow: 1;
    overflow-wrap: break-word; /* Ensure long messages wrap */
    word-break: break-all; /* Break long words */
  }

  .level-error {
    color: var(--accent-pink);
  }

  .level-warning {
    color: var(--accent-amber);
  }

  .level-info {
    color: var(--accent-blue);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: var(--text-secondary);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top: 3px solid var(--accent-blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>


