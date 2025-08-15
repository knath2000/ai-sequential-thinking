import { c as create_ssr_component, o as onDestroy, v as validate_component } from "../../chunks/ssr.js";
import { e as escape } from "../../chunks/escape.js";
const Tile = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { title } = $$props;
  let { value } = $$props;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0) $$bindings.title(title);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0) $$bindings.value(value);
  return `<div class="glass rounded-xl p-4"><div class="text-sm text-gray-400">${escape(title)}</div> <div class="mt-1 text-3xl font-semibold">${escape(value ?? "–")}</div></div>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let metrics = null;
  onDestroy(() => {
  });
  return `<div class="min-h-screen bg-gray-900 text-gray-100"><div class="mx-auto max-w-7xl p-6"><h1 class="text-2xl font-semibold mb-6" data-svelte-h="svelte-hrvmfv">Overview</h1> ${``} <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${validate_component(Tile, "Tile").$$render(
    $$result,
    {
      title: "Requests / min",
      value: metrics?.requests_per_minute
    },
    {},
    {}
  )} ${validate_component(Tile, "Tile").$$render(
    $$result,
    {
      title: "Avg response (ms)",
      value: metrics?.average_response_time
    },
    {},
    {}
  )} ${validate_component(Tile, "Tile").$$render(
    $$result,
    {
      title: "Success rate (%)",
      value: metrics?.success_rate
    },
    {},
    {}
  )} ${validate_component(Tile, "Tile").$$render(
    $$result,
    {
      title: "Active sessions",
      value: metrics?.active_sessions
    },
    {},
    {}
  )} ${validate_component(Tile, "Tile").$$render(
    $$result,
    {
      title: "Cost today (USD)",
      value: metrics?.total_cost_today
    },
    {},
    {}
  )} ${validate_component(Tile, "Tile").$$render(
    $$result,
    {
      title: "Top errors",
      value: "-"
    },
    {},
    {}
  )}</div></div></div>`;
});
export {
  Page as default
};
