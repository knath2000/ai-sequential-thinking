<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  let scrollY = 0;
  let navElement: HTMLElement;
  
  $: isScrolled = scrollY > 20;
  $: navOpacity = Math.min(0.95, 0.7 + (scrollY / 200) * 0.25);
</script>

<svelte:window bind:scrollY />

<nav 
  bind:this={navElement}
  class="liquid-nav" 
  class:scrolled={isScrolled}
  style="--nav-opacity: {navOpacity}"
>
  <div class="nav-backdrop"></div>
  <div class="nav-content">
    <div class="nav-brand">
      <h1>MCP Analytics</h1>
    </div>
    <div class="nav-links">
      <!-- Navigation items -->
    </div>
  </div>
  <div class="nav-edge"></div>
</nav>

<style>
  .liquid-nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    height: 80px;
    transition: all var(--glass-transition-fluid);
    will-change: transform, backdrop-filter;
  }
  
  .nav-backdrop {
    position: absolute;
    inset: 0;
    height: 200%;
    background: linear-gradient(
      to bottom,
      rgba(10, 10, 15, var(--nav-opacity)) 0%,
      rgba(10, 10, 15, 0.4) 50%,
      transparent 100%
    );
    backdrop-filter: var(--glass-blur-primary) saturate(180%);
    mask-image: linear-gradient(
      to bottom,
      black 0% 50%,
      transparent 50% 100%
    );
    pointer-events: none;
  }
  
  .nav-edge {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--glass-border-light);
    backdrop-filter: blur(8px) brightness(120%);
  }
  
  .scrolled .nav-backdrop {
    backdrop-filter: var(--glass-blur-primary) saturate(200%) brightness(110%);
  }
</style>
