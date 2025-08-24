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
		client: {start:"_app/immutable/entry/start.D1QbGj5m.js",app:"_app/immutable/entry/app.AWyZ5VbL.js",imports:["_app/immutable/entry/start.D1QbGj5m.js","_app/immutable/chunks/BII1_2WF.js","_app/immutable/chunks/CY_yKhkb.js","_app/immutable/chunks/B92kUjP9.js","_app/immutable/entry/app.AWyZ5VbL.js","_app/immutable/chunks/B92kUjP9.js","_app/immutable/chunks/CY_yKhkb.js","_app/immutable/chunks/NZTpNUN0.js","_app/immutable/chunks/CZVAaSPk.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
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
