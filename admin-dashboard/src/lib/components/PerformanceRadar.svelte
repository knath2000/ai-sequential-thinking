<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  
  export let data: any; // Keep this as export for external data binding
  
  let radarCanvas: HTMLCanvasElement;
  
  Chart.register(...registerables);
  
  onMount(() => {
    const ctx = radarCanvas.getContext('2d')!;
    
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Response Time', 'Throughput', 'Error Rate', 'CPU Usage', 'Memory', 'Disk I/O'],
        datasets: [{
          label: 'Current Performance',
          data: [85, 92, 98, 75, 88, 90],
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderColor: 'rgba(99, 102, 241, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
          pointBorderColor: 'rgba(255, 255, 255, 0.8)',
          pointBorderWidth: 2,
          pointRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'System Performance',
            color: 'rgba(255, 255, 255, 0.9)',
            font: {
              family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
              size: 16,
              weight: '600'
            }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            angleLines: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            pointLabels: {
              color: 'rgba(255, 255, 255, 0.7)',
              font: {
                family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
                size: 11
              }
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.5)',
              backdropColor: 'transparent'
            }
          }
        }
      }
    });
  });
</script>

<div class="radar-container">
  <canvas bind:this={radarCanvas}></canvas>
</div>

<style>
  .radar-container {
    height: 300px;
    position: relative;
  }
</style>
