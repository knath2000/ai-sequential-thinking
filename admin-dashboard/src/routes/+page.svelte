<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fetchJson, connectSSE } from '../lib/api';
  import type { DashboardMetrics } from '../lib/types';
  
  // Import new glassmorphic components
  import LiquidNavigation from '../lib/components/LiquidNavigation.svelte';
  import GlassCard from '../lib/components/GlassCard.svelte';
  import GlassChart from '../lib/components/GlassChart.svelte';
  import MetricTile from '../lib/components/MetricTile.svelte';
  import CostAnalyticsChart from '../lib/components/CostAnalyticsChart.svelte';
  import PerformanceRadar from '../lib/components/PerformanceRadar.svelte';
  import SessionsTable from '../lib/components/SessionsTable.svelte';
  import RecentLogs from '../lib/components/RecentLogs.svelte';
  
  let metrics: DashboardMetrics | null = null;
  let error: string | null = null;
  let es: EventSource | null = null;
  
  // Chart data preparation
  $: costTrendData = prepareCostTrendData(metrics);
  $: performanceData = preparePerformanceData(metrics);
  $: usageDistributionData = prepareUsageData(metrics);
  
  function prepareCostTrendData(metrics: DashboardMetrics | null) {
    if (!metrics || !metrics.cost_history) return null;
    
    return {
      labels: metrics.cost_history.map(item => new Date(item.date).toLocaleDateString()),
      datasets: [{
        label: 'Cost Trend (USD)',
        data: metrics.cost_history.map(item => item.cost),
        colors: ['rgba(99, 102, 241, 0.3)', 'rgba(99, 102, 241, 0.05)'],
        borderColor: 'rgba(99, 102, 241, 0.8)',
        fill: true
      }]
    };
  }
  
  function preparePerformanceData(metrics: DashboardMetrics | null) {
    if (!metrics || !metrics.performance_metrics_data) return null;

    const labels = metrics.performance_metrics_data.map(item => item.name);
    const dataValues = metrics.performance_metrics_data.map(item => item.value);

    return {
      labels,
      datasets: [{
        label: 'Current Performance',
        data: dataValues,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderColor: 'rgba(99, 102, 241, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: 'rgba(255, 255, 255, 0.8)',
        pointBorderWidth: 2,
        pointRadius: 6
      }]
    };
  }
  
  function prepareUsageData(metrics: DashboardMetrics | null) {
    if (!metrics || !metrics.usage_distribution_data) return null;

    const labels = metrics.usage_distribution_data.map(item => item.name);
    const dataValues = metrics.usage_distribution_data.map(item => item.count);

    return {
      labels,
      datasets: [{
        label: 'Usage Distribution',
        data: dataValues,
        backgroundColor: [
          'rgba(59, 130, 246, 0.6)',
          'rgba(139, 92, 246, 0.6)',
          'rgba(244, 63, 94, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(236, 72, 153, 0.6)',
          'rgba(245, 158, 11, 0.6)'
        ],
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }]
    };
  }
  
  // Load data and setup SSE
  onMount(async () => {
    try {
      metrics = await fetchJson<DashboardMetrics>('/analytics/dashboard');
      es = connectSSE('/analytics/stream', (ev) => {
        try {
          const parsed = JSON.parse(ev.data);
          if (parsed?.timestamp) {
            metrics = parsed as DashboardMetrics;
          }
        } catch {}
      });
    } catch (e) {
      error = (e as Error).message;
    }
  });

  onDestroy(() => es?.close());
</script>

<div class="liquid-dashboard">
  <LiquidNavigation />
  
  <!-- Animated background -->
  <div class="dashboard-background">
    <div class="gradient-orb orb-1"></div>
    <div class="gradient-orb orb-2"></div>
    <div class="gradient-orb orb-3"></div>
    </div>

  <main class="dashboard-content">
    <!-- Hero Metrics Section -->
    <section class="hero-metrics">
      <GlassCard variant="elevated" animated specular>
        <div class="hero-grid">
          <MetricTile 
            title="Active Sessions" 
            value={metrics?.active_sessions} 
            trend="+12.5%"
            icon="👥"
            color="blue"
          />
          <MetricTile 
            title="Response Time" 
            value={metrics?.average_response_time} 
            unit="ms"
            trend="-8.2%"
            icon="⚡"
            color="green"
          />
          <MetricTile 
            title="Success Rate" 
            value={metrics?.success_rate} 
            unit="%"
            trend="+2.1%"
            icon="✅"
            color="purple"
          />
          <MetricTile 
            title="Cost Today" 
            value={metrics?.total_cost_today} 
            unit="USD"
            trend="+$0.12"
            icon="💰"
            color="amber"
          />
        </div>
      </GlassCard>
    </section>
    
    <!-- Charts Section -->
    <section class="charts-grid">
      <GlassCard variant="primary" animated>
        <GlassChart 
          type="line" 
          data={costTrendData} 
          title="Cost Trends" 
          height={320}
        />
      </GlassCard>
      
      <GlassCard variant="primary" animated>
        <PerformanceRadar data={performanceData} />
      </GlassCard>
      
      <GlassCard variant="secondary" animated>
        <GlassChart 
          type="doughnut" 
          data={usageDistributionData} 
          title="Usage Distribution" 
          height={280}
        />
      </GlassCard>
    </section>
    
    <!-- Data Tables Section -->
    <section class="data-section">
      <GlassCard variant="primary">
        <SessionsTable enhanced />
      </GlassCard>
      
      <GlassCard variant="secondary">
        <RecentLogs enhanced />
      </GlassCard>
    </section>
  </main>
</div>

<style>
  .liquid-dashboard {
    min-height: 100vh;
    background: var(--bg-primary);
    position: relative;
    overflow-x: hidden;
  }
  
  .dashboard-background {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
  }
  
  .gradient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.3;
    animation: liquid-glass-shimmer var(--specular-duration) var(--specular-timing) infinite;
  }
  
  .orb-1 {
    width: 400px;
    height: 400px;
    top: -200px;
    right: -200px;
    background: var(--glass-gradient-primary);
  }
  
  .orb-2 {
    width: 300px;
    height: 300px;
    bottom: -150px;
    left: -150px;
    background: conic-gradient(
      from 180deg,
      rgba(139, 92, 246, 0.2),
      rgba(244, 63, 94, 0.15),
      rgba(99, 102, 241, 0.2)
    );
    animation-delay: -2s;
  }
  
  .orb-3 {
    width: 250px;
    height: 250px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(
      circle,
      rgba(16, 185, 129, 0.15),
      rgba(245, 158, 11, 0.1),
      transparent
    );
    animation-delay: -4s;
  }
  
  .dashboard-content {
    padding: 120px 24px 40px;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .hero-metrics {
    margin-bottom: 32px;
  }
  
  .hero-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;
    padding: 24px;
  }
  
  .charts-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr; /* Two charts + one radar chart */
    gap: 24px;
    margin-bottom: 32px;
  }
  
  .data-section {
    display: grid;
    grid-template-columns: 2fr 1fr; /* Sessions table + Recent logs */
    gap: 24px;
  }
  
  @media (max-width: 1024px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }
    
    .data-section {
      grid-template-columns: 1fr;
    }
  }
</style>


