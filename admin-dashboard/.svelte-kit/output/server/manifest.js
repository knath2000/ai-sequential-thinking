export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "dashboard/_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.gYRGuZs1.js",app:"_app/immutable/entry/app.yEJ7j3_B.js",imports:["_app/immutable/entry/start.gYRGuZs1.js","_app/immutable/chunks/D86GkuHu.js","_app/immutable/chunks/BsBVTIWJ.js","_app/immutable/chunks/Ds4fwPmf.js","_app/immutable/entry/app.yEJ7j3_B.js","_app/immutable/chunks/Ds4fwPmf.js","_app/immutable/chunks/BsBVTIWJ.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/BLq_cMMT.js","_app/immutable/chunks/DSusgRvu.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
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
