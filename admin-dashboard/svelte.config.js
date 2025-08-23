import adapter from '@sveltejs/adapter-vercel';
import sveltePreprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: sveltePreprocess(),
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
    // Use Vercel adapter for zero-config deployments on Vercel
    // Pin runtime to Node 20 to avoid Vercel/adapter issues while we upgrade deps
    adapter: adapter({
      runtime: 'nodejs20.x',
      regions: ['iad1'],
      // Ensure all dependencies are bundled
      external: [],
      split: false // Bundle everything together
    })
  }
};

export default config;


