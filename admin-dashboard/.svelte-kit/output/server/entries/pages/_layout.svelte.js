import { Q as fallback, T as slot, V as bind_props } from "../../chunks/index2.js";
function _layout($$payload, $$props) {
  let params = fallback($$props["params"], () => ({}), true);
  let url = fallback($$props["url"], () => ({}), true);
  let route = fallback($$props["route"], () => ({}), true);
  $$payload.out.push(`<!---->`);
  slot($$payload, $$props, "default", {});
  $$payload.out.push(`<!---->`);
  bind_props($$props, { params, url, route });
}
export {
  _layout as default
};
