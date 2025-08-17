import { c as create_ssr_component } from "../../../../chunks/ssr.js";
import { e as escape } from "../../../../chunks/escape.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { params } = $$props;
  if ($$props.params === void 0 && $$bindings.params && params !== void 0) $$bindings.params(params);
  return `<div class="min-h-screen bg-gray-900 text-gray-100"><div class="mx-auto max-w-7xl p-6"><h1 class="text-2xl font-semibold mb-4">Session: ${escape(params.session_id)}</h1> ${``} ${``}</div></div>`;
});
export {
  Page as default
};
