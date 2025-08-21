// vite.config.ts
import { sveltekit } from "file:///Users/kalyannath/Desktop/coding/ai-thinking-mcp/admin-dashboard/node_modules/.pnpm/@sveltejs+kit@2.36.1_@sveltejs+vite-plugin-svelte@3.1.2_svelte@4.2.20_vite@5.4.19_@type_1f85f57cf95b2e71113189c3268c6398/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///Users/kalyannath/Desktop/coding/ai-thinking-mcp/admin-dashboard/node_modules/.pnpm/vite@5.4.19_@types+node@20.19.11/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ["chart.js", "echarts"]
  },
  server: {
    port: 5173,
    hmr: {
      overlay: false
      // Disable HMR error overlay
    },
    proxy: {
      "/api": {
        target: "https://gallant-reflection-production.up.railway.app",
        changeOrigin: true,
        secure: true
      }
    }
  },
  optimizeDeps: {
    include: ["chart.js", "echarts"],
    exclude: ["@sveltejs/kit", "svelte"]
  },
  define: {
    global: "globalThis"
  },
  build: {
    sourcemap: false
    // Disable source maps in build
  },
  logLevel: "warn"
  // Suppress dependency source map warnings
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMva2FseWFubmF0aC9EZXNrdG9wL2NvZGluZy9haS10aGlua2luZy1tY3AvYWRtaW4tZGFzaGJvYXJkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMva2FseWFubmF0aC9EZXNrdG9wL2NvZGluZy9haS10aGlua2luZy1tY3AvYWRtaW4tZGFzaGJvYXJkL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9rYWx5YW5uYXRoL0Rlc2t0b3AvY29kaW5nL2FpLXRoaW5raW5nLW1jcC9hZG1pbi1kYXNoYm9hcmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBzdmVsdGVraXQgfSBmcm9tICdAc3ZlbHRlanMva2l0L3ZpdGUnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtzdmVsdGVraXQoKV0sXG4gIHNzcjoge1xuICAgIG5vRXh0ZXJuYWw6IFsnY2hhcnQuanMnLCAnZWNoYXJ0cyddXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgaG1yOiB7XG4gICAgICBvdmVybGF5OiBmYWxzZSAvLyBEaXNhYmxlIEhNUiBlcnJvciBvdmVybGF5XG4gICAgfSxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vZ2FsbGFudC1yZWZsZWN0aW9uLXByb2R1Y3Rpb24udXAucmFpbHdheS5hcHAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogWydjaGFydC5qcycsICdlY2hhcnRzJ10sXG4gICAgZXhjbHVkZTogWydAc3ZlbHRlanMva2l0JywgJ3N2ZWx0ZSddXG4gIH0sXG4gIGRlZmluZToge1xuICAgIGdsb2JhbDogJ2dsb2JhbFRoaXMnXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgc291cmNlbWFwOiBmYWxzZSAvLyBEaXNhYmxlIHNvdXJjZSBtYXBzIGluIGJ1aWxkXG4gIH0sXG4gIGxvZ0xldmVsOiAnd2FybicgLy8gU3VwcHJlc3MgZGVwZW5kZW5jeSBzb3VyY2UgbWFwIHdhcm5pbmdzXG59KTtcblxuXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWtYLFNBQVMsaUJBQWlCO0FBQzVZLFNBQVMsb0JBQW9CO0FBRTdCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxVQUFVLENBQUM7QUFBQSxFQUNyQixLQUFLO0FBQUEsSUFDSCxZQUFZLENBQUMsWUFBWSxTQUFTO0FBQUEsRUFDcEM7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLEtBQUs7QUFBQSxNQUNILFNBQVM7QUFBQTtBQUFBLElBQ1g7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxZQUFZLFNBQVM7QUFBQSxJQUMvQixTQUFTLENBQUMsaUJBQWlCLFFBQVE7QUFBQSxFQUNyQztBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sUUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFdBQVc7QUFBQTtBQUFBLEVBQ2I7QUFBQSxFQUNBLFVBQVU7QUFBQTtBQUNaLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
