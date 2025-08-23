import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    target: 'node22',
    sourcemap: false,
    chunkSizeWarningLimit: 1000
  },
  ssr: {
    noExternal: ['chart.js', 'echarts']
  },
  server: {
    port: 5173,
    hmr: {
      overlay: false
    }
  },
  optimizeDeps: {
    include: ['chart.js', 'echarts']
  },
  define: {
    global: 'globalThis',
    __VERCEL__: JSON.stringify(process.env.VERCEL === '1')
  },
  logLevel: 'warn'
});
