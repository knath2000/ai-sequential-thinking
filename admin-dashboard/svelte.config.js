import adapter from '@sveltejs/adapter-static';
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
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false
    }),
    paths: {
      base: '/dashboard'
    }
  }
};

export default config;


