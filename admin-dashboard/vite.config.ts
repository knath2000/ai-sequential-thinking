import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    rollupOptions: {
      external: []
    },
    target: 'node22',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    outDir: '.svelte-kit/output'
  },
  ssr: {
    noExternal: ['@sveltejs/kit', 'chart.js', 'echarts']
  },
  server: {
    port: 5173,
    hmr: {
      overlay: false
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
    include: ['chart.js', 'echarts']
  },
  define: {
    global: 'globalThis',
    __VERCEL__: JSON.stringify(process.env.VERCEL === '1')
  },
  logLevel: 'warn'
});


