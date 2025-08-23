export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.2LxcR3c5.js",app:"_app/immutable/entry/app.BaOHCeEG.js",imports:["_app/immutable/entry/start.2LxcR3c5.js","_app/immutable/chunks/C1vYeD2X.js","_app/immutable/chunks/a8HRLC9V.js","_app/immutable/chunks/iGYDGeBs.js","_app/immutable/entry/app.BaOHCeEG.js","_app/immutable/chunks/iGYDGeBs.js","_app/immutable/chunks/a8HRLC9V.js","_app/immutable/chunks/NZTpNUN0.js","_app/immutable/chunks/3dTjdgB6.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js')),
			__memo(() => import('../output/server/nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
