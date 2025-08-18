import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ['chart.js', 'echarts']
  },
  server: {
    port: 5173,
    hmr: {
      overlay: false // Disable HMR error overlay
    },
    proxy: {
      '/api': {
        target: 'https://gallant-reflection-production.up.railway.app',
        changeOrigin: true,
        secure: true
      }
    }
  },
  optimizeDeps: {
    include: ['chart.js', 'echarts'],
    exclude: ['@sveltejs/kit', 'svelte']
  },
  define: {
    global: 'globalThis'
  },
  build: {
    sourcemap: false // Disable source maps in build
  },
  logLevel: 'warn' // Suppress dependency source map warnings
});


