<script lang="ts">
  export let title: string;
  export let value: number | string | undefined;
  export let unit: string = '';
  export let trend: string = '';
  export let icon: string = '';
  export let color: 'blue' | 'green' | 'purple' | 'amber' | 'pink' = 'blue';
  
  $: colorClass = `metric-tile--${color}`;
  $: formattedValue = typeof value === 'number' ? 
    new Intl.NumberFormat().format(value) : 
    value || '—';
  $: isPositiveTrend = trend.startsWith('+');
</script>

<div class="metric-tile {colorClass}">
  <div class="metric-icon">
    <span class="icon">{icon}</span>
  </div>
  
  <div class="metric-content">
    <div class="metric-title">{title}</div>
    <div class="metric-value">
      {formattedValue}{unit}
    </div>
    {#if trend}
      <div class="metric-trend" class:positive={isPositiveTrend}>
        {trend}
      </div>
    {/if}
  </div>
  
  <div class="metric-glass-overlay"></div>
</div>

<style>
  .metric-tile {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: var(--glass-secondary);
    backdrop-filter: var(--glass-blur-secondary) saturate(150%);
    border: 1px solid var(--glass-border-light);
    border-radius: 16px;
    box-shadow: var(--glass-shadow-primary);
    transition: all var(--glass-transition-smooth);
    overflow: hidden;
  }
  
  .metric-tile:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: var(--glass-shadow-elevated);
    background: rgba(255, 255, 255, 0.18);
    will-change: transform, box-shadow, background;
  }
  
  .metric-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: var(--glass-accent);
    backdrop-filter: var(--glass-blur-subtle);
    border-radius: 12px;
    border: 1px solid var(--glass-border-light);
  }
  
  .icon {
    font-size: 24px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
  
  .metric-content {
    flex: 1;
  }
  
  .metric-title {
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  
  .metric-value {
    color: var(--text-primary);
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }
  
  .metric-trend {
    font-size: 12px;
    font-weight: 600;
    margin-top: 4px;
    opacity: 0.8;
  }
  
  .metric-trend.positive {
    color: var(--accent-green);
  }
  
  .metric-trend:not(.positive) {
    color: var(--accent-pink);
  }
  
  .metric-glass-overlay {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transition: left var(--glass-transition-fluid);
    pointer-events: none;
  }
  
  .metric-tile:hover .metric-glass-overlay {
    left: 100%;
  }
  
  /* Color Variants */
  .metric-tile--blue .metric-icon {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.3);
  }
  
  .metric-tile--green .metric-icon {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.3);
  }
  
  .metric-tile--purple .metric-icon {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.3);
  }
  
  .metric-tile--amber .metric-icon {
    background: rgba(245, 158, 11, 0.2);
    border-color: rgba(245, 158, 11, 0.3);
  }
</style>
