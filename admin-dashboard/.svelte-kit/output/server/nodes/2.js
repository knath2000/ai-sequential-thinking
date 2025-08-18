

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.3_2QhBZX.js","_app/immutable/chunks/BI1YnF75.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/Cau6Zbvx.js"];
export const stylesheets = ["_app/immutable/assets/2.ry_at-v5.css"];
export const fonts = [];
