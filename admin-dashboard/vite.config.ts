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
      overlay: false // Disables HMR error overlay
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
    include: ['chart.js', 'echarts'] // Remove exclusions to allow Vercel to bundle all dependencies
  },
  define: {
    global: 'globalThis',
    __VERCEL__: JSON.stringify(process.env.VERCEL === '1')
  },
  build: {
    sourcemap: false, // Disable source maps in build
    chunkSizeWarningLimit: 1000 // Increase chunk size warning limit
  },
  logLevel: 'warn' // Suppresses dependency source map warnings
});


