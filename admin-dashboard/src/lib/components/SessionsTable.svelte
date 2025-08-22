<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchJson } from '../api';
  import type { SessionResponse } from '../types';
  import SessionDetailModal from './SessionDetailModal.svelte';
  
  let sessions: SessionResponse[] = [];
  let loading = true;
  let selectedSession: SessionResponse | null = null;
  let showModal = false;

  function formatSessionId(id: any): string {
    if (typeof id === 'string') return id.slice(0, 8);
    if (typeof id === 'number') return String(id).slice(0, 8);
    return String(id || 'unknown').slice(0, 8);
  }
  
  onMount(async () => {
    try {
      sessions = await fetchJson<SessionResponse[]>('/analytics/sessions?limit=20');
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      loading = false;
    }
  });
  
  function openSessionDetail(session: SessionResponse) {
    selectedSession = session;
    showModal = true;
  }
</script>

<div class="glass-table-container">
  <div class="table-header">
    <h3>Recent Sessions</h3>
    <div class="table-actions">
      <button class="glass-button">
        <span>↻</span> Refresh
      </button>
    </div>
  </div>
  
  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading sessions...</span>
    </div>
  {:else}
    <div class="glass-table">
      <div class="table-header-row">
        <div class="header-cell">Session ID</div>
        <div class="header-cell">Started</div>
        <div class="header-cell">Duration</div>
        <div class="header-cell">Events</div>
        <div class="header-cell">Status</div>
      </div>
      
      {#each sessions as session (session.id)}
        <div
          class="table-row"
          on:click={() => openSessionDetail(session)}
          on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSessionDetail(session); } }}
          role="button"
          tabindex="0"
        >
          <div class="table-cell">
            <span class="session-id">{formatSessionId(session.id)}...</span>
          </div>
          <div class="table-cell">
            {new Date(session.created_at).toLocaleString()}
          </div>
          <div class="table-cell">
            <span class="duration-badge">
              {session.duration || '—'}
            </span>
          </div>
          <div class="table-cell">
            <span class="event-count">{session.total_requests || 0}</span>
          </div>
          <div class="table-cell">
            <span class="status-badge status-{session.status}">
              {session.status || 'active'}
            </span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showModal && selectedSession}
  <SessionDetailModal 
    bind:show={showModal} 
    sessionDetail={selectedSession} 
  />
{/if}

<style>
  .glass-table-container {
    background: var(--glass-primary);
    backdrop-filter: var(--glass-blur-primary);
    border: 1px solid var(--glass-border-light);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: var(--glass-shadow-primary);
  }
  
  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--glass-border-light);
    background: rgba(255, 255, 255, 0.05);
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
  
  .glass-table {
    overflow-x: auto;
  }
  
  .table-header-row {
    display: grid;
    grid-template-columns: 2fr 2fr 1fr 1fr 1fr;
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid var(--glass-border-light);
  }
  
  .header-cell {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .table-row {
    display: grid;
    grid-template-columns: 2fr 2fr 1fr 1fr 1fr;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: all var(--glass-transition-fast);
  }
  
  .table-row:hover {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: var(--glass-blur-subtle) brightness(110%);
  }
  
  .table-cell {
    color: var(--text-primary);
    font-size: 14px;
    display: flex;
    align-items: center;
  }
  
  .session-id {
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
    background: rgba(99, 102, 241, 0.1);
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
  }
  
  .status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
  }
  
  .status-active {
    background: rgba(16, 185, 129, 0.2);
    color: var(--accent-green);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  .status-completed {
    background: rgba(59, 130, 246, 0.2);
    color: var(--accent-blue);
    border: 1px solid rgba(59, 130, 246, 0.3);
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


