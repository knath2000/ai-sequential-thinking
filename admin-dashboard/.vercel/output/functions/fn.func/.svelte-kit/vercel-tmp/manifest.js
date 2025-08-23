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
		client: {start:"_app/immutable/entry/start.CmIdF0tB.js",app:"_app/immutable/entry/app.Bl4rl0c8.js",imports:["_app/immutable/entry/start.CmIdF0tB.js","_app/immutable/chunks/C23wnQyn.js","_app/immutable/chunks/qjyYhLW6.js","_app/immutable/chunks/C56QmhJh.js","_app/immutable/entry/app.Bl4rl0c8.js","_app/immutable/chunks/C56QmhJh.js","_app/immutable/chunks/qjyYhLW6.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/BXKfCUwU.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
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
