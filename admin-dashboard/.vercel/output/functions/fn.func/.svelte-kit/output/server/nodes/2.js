

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.DW4AxNHs.js","_app/immutable/chunks/BI1YnF75.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/CCymuoeA.js"];
export const stylesheets = ["_app/immutable/assets/2.akBtRjyS.css"];
export const fonts = [];
