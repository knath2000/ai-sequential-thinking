import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  warningFilter: (warning) => {
    const ignore = [
      'a11y_click_events_have_key_events',
      'a11y_no_static_element_interactions',
      'a11y_no_noninteractive_element_interactions',
      'export_let_unused'
    ];
    return !ignore.includes(warning.code);
  },
  kit: {
    adapter: adapter({
      runtime: 'nodejs22.x',
      regions: ['iad1']
    })
  }
};

export default config;
