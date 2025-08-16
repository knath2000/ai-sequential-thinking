import { c as create_ssr_component, b as subscribe } from "../../../../chunks/ssr.js";
import { p as page } from "../../../../chunks/stores.js";
import { e as escape } from "../../../../chunks/escape.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => value);
  let sessionId = "";
  $$unsubscribe_page();
  return `<div class="min-h-screen bg-gray-900 text-gray-100"><div class="mx-auto max-w-6xl p-6"><a href="/dashboard" class="text-sm text-blue-400 hover:underline" data-svelte-h="svelte-wvc3xi">← Back</a> <h1 class="text-2xl font-semibold mt-2">Session ${escape(sessionId)}</h1> ${`<div class="mt-4 text-sm text-gray-400" data-svelte-h="svelte-1qhj9eb">Loading…</div>`}</div></div>`;
});
export {
  Page as default
};
