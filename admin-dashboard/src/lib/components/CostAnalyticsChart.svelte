<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { liquidGlassChartTheme, generateGlassGradient } from '../themes/chartThemes';
  
  export let data: any = null; // Initialize data to null
  export let title: string = 'Cost Analytics';
  export let height: number = 300;
  
  let chartCanvas: HTMLCanvasElement;
  let chartInstance: Chart;
  
  Chart.register(...registerables);
  
  const initializeChart = () => {
    if (!chartCanvas) return; // Ensure canvas exists
    if (!data || !data.datasets) {
      console.warn('Chart data not available yet, skipping initialization');
      return; // Skip initialization if data is null or empty
    }

    const ctx = chartCanvas.getContext('2d')!;
    
    if (chartInstance) {
        chartInstance.destroy(); // Destroy existing instance before re-creating
    }

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        ...data,
        datasets: (data?.datasets || []).map((dataset: any) => ({
          ...dataset,
          backgroundColor: generateGlassGradient(ctx, dataset.colors || ['rgba(99, 102, 241, 0.2)', 'transparent']),
          borderColor: dataset.borderColor || 'rgba(99, 102, 241, 0.8)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        }))
      },
      options: {
        ...liquidGlassChartTheme,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          ...liquidGlassChartTheme.plugins,
          title: {
            display: !!title,
            text: title,
            color: 'rgba(255, 255, 255, 0.9)',
            font: {
              family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
              size: 16,
              weight: '600'
            },
            padding: 20
          }
        },
        scales: {
          x: {
            ...liquidGlassChartTheme.scales.x,
            type: 'time', // Assuming time series data
            time: {
              unit: 'day',
              tooltipFormat: 'MMM D',
              displayFormats: {
                day: 'MMM D'
              }
            }
          },
          y: {
            ...liquidGlassChartTheme.scales.y,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cost (USD)',
              color: 'rgba(255, 255, 255, 0.7)'
            }
          }
        }
      }
    });
  };

  onMount(() => {
    initializeChart();
    return () => chartInstance?.destroy();
  });

  // Reactive update when data changes
  $: if (chartInstance && data && data.datasets) {
    chartInstance.data = {
      ...data,
      datasets: (data.datasets || []).map((dataset: any) => ({
        ...dataset,
        backgroundColor: generateGlassGradient(chartCanvas.getContext('2d')!, dataset.colors || ['rgba(99, 102, 241, 0.2)', 'transparent']),
        borderColor: dataset.borderColor || 'rgba(99, 102, 241, 0.8)',
        borderWidth: 2,
        tension: 0.4,
      }))
    };
    chartInstance.update();
  }
</script>

{#if data && data.datasets}
  <div class="glass-chart-container" style="height: {height}px">
    <canvas bind:this={chartCanvas}></canvas>
  </div>
{:else}
  <div class="glass-chart-container glass-chart-loading" style="height: {height}px">
    <div class="loading-shimmer">
      <div class="shimmer-line"></div>
      <div class="shimmer-line"></div>
      <div class="shimmer-line"></div>
    </div>
  </div>
{/if}

<style>
  .glass-chart-container {
    position: relative;
    background: var(--glass-secondary);
    backdrop-filter: var(--glass-blur-secondary);
    border: 1px solid var(--glass-border-light);
    border-radius: 16px;
    padding: 16px;
    overflow: hidden;
  }
  
  .glass-chart-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--glass-edge-highlight);
    pointer-events: none;
  }

  /* Loading State Styles */
  .glass-chart-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--glass-secondary) !important;
    border: 1px solid var(--glass-border-dark) !important;
  }

  .loading-shimmer {
    width: 80%;
    height: 80%;
    background: linear-gradient(to right, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    padding: 10px;
  }

  .shimmer-line {
    height: 10px;
    background-color: rgba(255,255,255,0.1);
    border-radius: 4px;
  }
  .shimmer-line:nth-child(1) { width: 90%; }
  .shimmer-line:nth-child(2) { width: 70%; }
  .shimmer-line:nth-child(3) { width: 80%; }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
</style>
