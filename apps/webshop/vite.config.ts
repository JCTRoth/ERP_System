import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

const gatewayUrl = process.env.GATEWAY_URL || "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3008,
    host: true,
    proxy: {
      "/graphql": {
        target: gatewayUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          apollo: ["@apollo/client", "graphql"],
        },
      },
    },
  },
});
