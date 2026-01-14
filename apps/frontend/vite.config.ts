import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const gatewayUrl = process.env.VITE_GATEWAY_URL || "http://localhost:4000";
const shopUrl = process.env.VITE_SHOP_URL || "http://localhost:5003";
const notificationUrl =
  process.env.VITE_NOTIFICATION_URL || "http://notification-service:8082";

// Log resolved backend targets when Vite starts (helps debug proxy DNS issues)
console.log(
  `[vite] using gateway target: ${gatewayUrl}, shop target: ${shopUrl}`,
);

export default defineConfig({
  plugins: [react() as any],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@erp/shared-types": path.resolve(
        __dirname,
        "../../libs/shared-types/src",
      ),
      "@erp/i18n": path.resolve(__dirname, "../../libs/i18n/src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Direct notification REST endpoints (SMTP configuration) should go to the notification service
      "/api/smtp-configuration": {
        target: notificationUrl,
        changeOrigin: true,
        secure: false,
      },
      // Route shop-specific requests directly to the Shop service in dev
      "/shop/graphql": {
        target: shopUrl,
        changeOrigin: true,
        secure: false,
        rewrite: (path: string) => path.replace(/^\/shop\/graphql/, "/graphql"),
      },
      // Gateway endpoints
      "/graphql": {
        target: gatewayUrl,
        changeOrigin: true,
        secure: false,
      },
      "/api": {
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
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
        },
      },
    },
  },
});
