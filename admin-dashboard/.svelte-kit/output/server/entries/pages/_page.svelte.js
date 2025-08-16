import { c as create_ssr_component, e as each, o as onDestroy, v as validate_component } from "../../chunks/ssr.js";
import { e as escape } from "../../chunks/escape.js";
const Tile = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { title } = $$props;
  let { value } = $$props;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0) $$bindings.title(title);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0) $$bindings.value(value);
  return `<div class="glass rounded-xl p-4"><div class="text-sm text-gray-400">${escape(title)}</div> <div class="mt-1 text-3xl font-semibold">${escape(value ?? "–")}</div></div>`;
});
const RecentLogs = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { pollMs = 3e3 } = $$props;
  let { max = 200 } = $$props;
  let { level } = $$props;
  let rows = [];
  if ($$props.pollMs === void 0 && $$bindings.pollMs && pollMs !== void 0) $$bindings.pollMs(pollMs);
  if ($$props.max === void 0 && $$bindings.max && max !== void 0) $$bindings.max(max);
  if ($$props.level === void 0 && $$bindings.level && level !== void 0) $$bindings.level(level);
  return `<div class="rounded-lg border border-gray-700 bg-gray-900/60"><div class="flex items-center justify-between px-3 py-2 border-b border-gray-700"><div class="text-sm font-semibold" data-svelte-h="svelte-64tdm0">Recent Logs</div> <button class="text-xs text-blue-400 hover:underline" data-svelte-h="svelte-9svlmm">Refresh</button></div> ${``} <div class="max-h-64 overflow-auto text-xs">${each(rows, (r) => {
    return `<div class="px-3 py-1 whitespace-pre-wrap"><span class="text-gray-500">[${escape(r.ts)}]</span> <span class="${"ml-1 font-semibold " + escape(
      r.level === "ERROR" ? "text-red-400" : r.level === "WARNING" ? "text-yellow-400" : "text-green-400",
      true
    )}">${escape(r.level)}</span> <span class="ml-1 text-gray-400">${escape(r.name)}</span> <span class="ml-2">${escape(r.message)}</span> </div>`;
  })}</div></div>`;
});
const SessionsTable = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { pageSize = 20 } = $$props;
  let rows = [];
  if ($$props.pageSize === void 0 && $$bindings.pageSize && pageSize !== void 0) $$bindings.pageSize(pageSize);
  return `<div class="rounded-lg border border-gray-700 bg-gray-900/60"><div class="flex items-center justify-between px-3 py-2 border-b border-gray-700"><div class="text-sm font-semibold" data-svelte-h="svelte-1d3eqnm">Recent Sessions</div> <button class="text-xs text-blue-400 hover:underline" data-svelte-h="svelte-9svlmm">Refresh</button></div> ${``} <div class="overflow-auto"><table class="min-w-full text-left text-xs"><thead class="bg-gray-800 text-gray-300" data-svelte-h="svelte-1dstrq3"><tr><th class="px-3 py-2">Session</th> <th class="px-3 py-2">Created</th> <th class="px-3 py-2">Requests</th> <th class="px-3 py-2">Errors</th> <th class="px-3 py-2">Proc (ms)</th></tr></thead> <tbody>${each(rows, (s) => {
    return `<tr class="border-t border-gray-800 hover:bg-gray-800/40 cursor-pointer"><td class="px-3 py-2 font-mono text-blue-400 underline">${escape(s.session_id)}</td> <td class="px-3 py-2">${escape(new Date(s.created_at).toLocaleString())}</td> <td class="px-3 py-2">${escape(s.total_requests)}</td> <td class="px-3 py-2">${escape(s.total_errors)}</td> <td class="px-3 py-2">${escape(s.total_processing_time_ms)}</td> </tr>`;
  })}</tbody></table></div></div>`;
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
  )}</div> <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">${validate_component(RecentLogs, "RecentLogs").$$render($$result, {}, {}, {})} ${validate_component(SessionsTable, "SessionsTable").$$render($$result, {}, {}, {})}</div></div></div>`;
});
export {
  Page as default
};
