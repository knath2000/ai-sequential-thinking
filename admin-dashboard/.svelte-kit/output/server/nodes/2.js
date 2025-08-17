

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.BgQUrJRV.js","_app/immutable/chunks/Cj5CJtXD.js","_app/immutable/chunks/IHki7fMi.js"];
export const stylesheets = ["_app/immutable/assets/2.Dx4LF2Le.css"];
export const fonts = [];
