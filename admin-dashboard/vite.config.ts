import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ['chart.js']
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://gallant-reflection-production.up.railway.app',
        changeOrigin: true,
        secure: true
      }
    }
  },
  optimizeDeps: {
    include: ['chart.js']
  }
});


