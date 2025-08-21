

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.CO27wvwq.js","_app/immutable/chunks/BI1YnF75.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/Bll0xg7b.js"];
export const stylesheets = [];
export const fonts = [];
