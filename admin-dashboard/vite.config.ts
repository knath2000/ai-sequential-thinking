import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    target: 'es2022'
  },
  define: {
    __VERCEL_FRAMEWORK__: JSON.stringify('sveltekit')
  }
});
