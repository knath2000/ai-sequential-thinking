import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    target: 'es2022',
    rollupOptions: {
      external: []
    }
  },
  define: {
    __VERCEL_FRAMEWORK__: JSON.stringify('sveltekit')
  },
  resolve: {
    preserveSymlinks: false
  },
  ssr: {
    noExternal: ['@sveltejs/kit']
  }
});
