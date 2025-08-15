

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.D8vQZKRy.js","_app/immutable/chunks/BDr4HxwF.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/npG4xz0H.js"];
export const stylesheets = [];
export const fonts = [];
