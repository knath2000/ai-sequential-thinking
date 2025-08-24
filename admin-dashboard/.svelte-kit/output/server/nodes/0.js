

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.PAvNQpyv.js","_app/immutable/chunks/D-u0lQdg.js","_app/immutable/chunks/IHki7fMi.js"];
export const stylesheets = ["_app/immutable/assets/0.CeoRx9Oy.css"];
export const fonts = [];
