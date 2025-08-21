import { c as create_ssr_component } from "../../chunks/ssr.js";
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { params = {} } = $$props;
  let { url = {} } = $$props;
  let { route = {} } = $$props;
  if ($$props.params === void 0 && $$bindings.params && params !== void 0) $$bindings.params(params);
  if ($$props.url === void 0 && $$bindings.url && url !== void 0) $$bindings.url(url);
  if ($$props.route === void 0 && $$bindings.route && route !== void 0) $$bindings.route(route);
  return `${slots.default ? slots.default({}) : ``}`;
});
export {
  Layout as default
};
