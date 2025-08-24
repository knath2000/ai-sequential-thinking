import { z as current_component, F as attr_class, G as attr_style, J as stringify, K as clsx, w as slot, N as bind_props, t as push, v as pop, y as escape_html, O as copy_payload, P as assign_payload } from "../../chunks/index2.js";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "../../chunks/state.svelte.js";
import { j as fallback } from "../../chunks/utils2.js";
import { Chart, registerables } from "chart.js";
function onDestroy(fn) {
  var context = (
    /** @type {Component} */
    current_component
  );
  (context.d ??= []).push(fn);
}
function LiquidNavigation($$payload) {
  let isScrolled, navOpacity;
  let scrollY = 0;
  isScrolled = scrollY > 20;
  navOpacity = Math.min(0.95, 0.7 + scrollY / 200 * 0.25);
  $$payload.out.push(`<nav${attr_class("liquid-nav svelte-1t31i7p", void 0, { "scrolled": isScrolled })}${attr_style(`--nav-opacity: ${stringify(navOpacity)}`)}><div class="nav-backdrop svelte-1t31i7p"></div> <div class="nav-content"><div class="nav-brand"><h1>MCP Analytics</h1></div> <div class="nav-links"></div></div> <div class="nav-edge svelte-1t31i7p"></div></nav>`);
}
function GlassCard($$payload, $$props) {
  let glassClass;
  let variant = fallback($$props["variant"], "primary");
  let animated = fallback($$props["animated"], true);
  let specular = fallback($$props["specular"], false);
  glassClass = `glass-card glass-card--${variant}`;
  $$payload.out.push(`<div${attr_class(clsx(glassClass), "svelte-3kxrhk", { "animated": animated, "specular": specular })}><div class="glass-content"><!---->`);
  slot($$payload, $$props, "default", {});
  $$payload.out.push(`<!----></div> `);
  if (specular) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="specular-highlight svelte-3kxrhk"></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  bind_props($$props, { variant, animated, specular });
}
function GlassChart($$payload, $$props) {
  push();
  let type = fallback($$props["type"], "line");
  let data = fallback(
    $$props["data"],
    null
    // Initialize data to null
  );
  let title = $$props["title"];
  let height = fallback($$props["height"], 300);
  Chart.register(...registerables);
  if (data && data.datasets) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="glass-chart-container svelte-1qcoguk"${attr_style(`height: ${stringify(height)}px`)}><canvas class="svelte-1qcoguk"></canvas></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="glass-chart-container glass-chart-loading svelte-1qcoguk"${attr_style(`height: ${stringify(height)}px`)}><div class="loading-shimmer svelte-1qcoguk"><div class="shimmer-line svelte-1qcoguk"></div> <div class="shimmer-line svelte-1qcoguk"></div> <div class="shimmer-line svelte-1qcoguk"></div></div></div>`);
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { type, data, title, height });
  pop();
}
function MetricTile($$payload, $$props) {
  push();
  let colorClass, formattedValue, isPositiveTrend;
  let title = $$props["title"];
  let value = $$props["value"];
  let unit = fallback($$props["unit"], "");
  let trend = fallback($$props["trend"], "");
  let icon = fallback($$props["icon"], "");
  let color = fallback($$props["color"], "blue");
  colorClass = `metric-tile--${color}`;
  formattedValue = typeof value === "number" ? new Intl.NumberFormat().format(value) : value || "—";
  isPositiveTrend = trend.startsWith("+");
  $$payload.out.push(`<div${attr_class(`metric-tile ${stringify(colorClass)}`, "svelte-1s6vw74")}><div class="metric-icon svelte-1s6vw74"><span class="icon svelte-1s6vw74">${escape_html(icon)}</span></div> <div class="metric-content svelte-1s6vw74"><div class="metric-title svelte-1s6vw74">${escape_html(title)}</div> <div class="metric-value svelte-1s6vw74">${escape_html(formattedValue)}${escape_html(unit)}</div> `);
  if (trend) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div${attr_class("metric-trend svelte-1s6vw74", void 0, { "positive": isPositiveTrend })}>${escape_html(trend)}</div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div> <div class="metric-glass-overlay svelte-1s6vw74"></div></div>`);
  bind_props($$props, { title, value, unit, trend, icon, color });
  pop();
}
function PerformanceRadar($$payload, $$props) {
  push();
  Chart.register(...registerables);
  $$payload.out.push(`<div class="radar-container svelte-ifivxs"><canvas></canvas></div>`);
  pop();
}
function SessionsTable($$payload, $$props) {
  push();
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div class="glass-table-container svelte-exvabl"><div class="table-header svelte-exvabl"><h3 class="svelte-exvabl">Recent Sessions</h3> <div class="table-actions svelte-exvabl"><button class="glass-button svelte-exvabl"><span class="svelte-exvabl">↻</span> Refresh</button></div></div> `);
    {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<div class="loading-state svelte-exvabl"><div class="loading-spinner svelte-exvabl"></div> <span class="svelte-exvabl">Loading sessions...</span></div>`);
    }
    $$payload2.out.push(`<!--]--></div> `);
    {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
function RecentLogs($$payload, $$props) {
  push();
  $$payload.out.push(`<div class="glass-table-container svelte-cd9rku"><div class="table-header svelte-cd9rku"><h3 class="svelte-cd9rku">Recent Logs</h3> <div class="table-actions svelte-cd9rku"><button class="glass-button svelte-cd9rku"><span class="svelte-cd9rku">↻</span> Refresh</button></div></div> `);
  {
    $$payload.out.push("<!--[!-->");
    {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="loading-state svelte-cd9rku"><div class="loading-spinner svelte-cd9rku"></div> <span class="svelte-cd9rku">Loading logs...</span></div>`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function _page($$payload, $$props) {
  push();
  let costTrendData, usageDistributionData;
  let metrics = null;
  let es = null;
  function prepareCostTrendData(metrics2) {
    return null;
  }
  function prepareUsageData(metrics2) {
    return null;
  }
  onDestroy(() => es?.close());
  costTrendData = prepareCostTrendData();
  usageDistributionData = prepareUsageData();
  $$payload.out.push(`<div class="liquid-dashboard svelte-1clg4lq">`);
  LiquidNavigation($$payload);
  $$payload.out.push(`<!----> <div class="dashboard-background svelte-1clg4lq"><div class="gradient-orb orb-1 svelte-1clg4lq"></div> <div class="gradient-orb orb-2 svelte-1clg4lq"></div> <div class="gradient-orb orb-3 svelte-1clg4lq"></div></div> <main class="dashboard-content svelte-1clg4lq"><section class="hero-metrics svelte-1clg4lq">`);
  GlassCard($$payload, {
    variant: "elevated",
    animated: true,
    specular: true,
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="hero-grid svelte-1clg4lq">`);
      MetricTile($$payload2, {
        title: "Active Sessions",
        value: metrics?.active_sessions,
        trend: "+12.5%",
        icon: "👥",
        color: "blue"
      });
      $$payload2.out.push(`<!----> `);
      MetricTile($$payload2, {
        title: "Response Time",
        value: metrics?.average_response_time,
        unit: "ms",
        trend: "-8.2%",
        icon: "⚡",
        color: "green"
      });
      $$payload2.out.push(`<!----> `);
      MetricTile($$payload2, {
        title: "Success Rate",
        value: metrics?.success_rate,
        unit: "%",
        trend: "+2.1%",
        icon: "✅",
        color: "purple"
      });
      $$payload2.out.push(`<!----> `);
      MetricTile($$payload2, {
        title: "Cost Today",
        value: metrics?.total_cost_today,
        unit: "USD",
        trend: "+$0.12",
        icon: "💰",
        color: "amber"
      });
      $$payload2.out.push(`<!----></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></section> <section class="charts-grid svelte-1clg4lq">`);
  GlassCard($$payload, {
    variant: "primary",
    animated: true,
    children: ($$payload2) => {
      GlassChart($$payload2, {
        type: "line",
        data: costTrendData,
        title: "Cost Trends",
        height: 320
      });
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  GlassCard($$payload, {
    variant: "primary",
    animated: true,
    children: ($$payload2) => {
      PerformanceRadar($$payload2);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  GlassCard($$payload, {
    variant: "secondary",
    animated: true,
    children: ($$payload2) => {
      GlassChart($$payload2, {
        type: "doughnut",
        data: usageDistributionData,
        title: "Usage Distribution",
        height: 280
      });
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></section> <section class="data-section svelte-1clg4lq">`);
  GlassCard($$payload, {
    variant: "primary",
    children: ($$payload2) => {
      SessionsTable($$payload2);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  GlassCard($$payload, {
    variant: "secondary",
    children: ($$payload2) => {
      RecentLogs($$payload2);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></section></main></div>`);
  pop();
}
export {
  _page as default
};
