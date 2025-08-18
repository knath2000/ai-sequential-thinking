<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'elevated' = 'primary';
  export let animated: boolean = true;
  export let specular: boolean = false;
  
  $: glassClass = `glass-card glass-card--${variant}`;
</script>

<div class={glassClass} class:animated class:specular>
  <div class="glass-content">
    <slot />
  </div>
  {#if specular}
    <div class="specular-highlight"></div>
  {/if}
</div>

<style>
  .glass-card {
    position: relative;
    background: var(--glass-primary);
    backdrop-filter: var(--glass-blur-primary);
    border: 1px solid var(--glass-border-light);
    border-radius: 16px;
    box-shadow: var(--glass-shadow-primary);
    overflow: hidden;
    transition: all var(--glass-transition-smooth);
  }
  
  .glass-card--elevated {
    background: var(--glass-secondary);
    backdrop-filter: var(--glass-blur-secondary);
    box-shadow: var(--glass-shadow-elevated);
    border-radius: 20px;
  }
  
  .glass-card.animated:hover {
    transform: translateY(-2px);
    box-shadow: var(--glass-shadow-floating);
    background: rgba(255, 255, 255, 0.18);
    will-change: transform, box-shadow, background;
  }
  
  .specular-highlight {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 70%
    );
    animation: specular-highlight var(--specular-duration) var(--specular-timing) infinite;
    pointer-events: none;
  }
</style>
