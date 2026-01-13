import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
var gatewayUrl = process.env.VITE_GATEWAY_URL || 'http://localhost:4000';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@erp/shared-types': path.resolve(__dirname, '../../libs/shared-types/src'),
            '@erp/i18n': path.resolve(__dirname, '../../libs/i18n/src'),
        },
    },
    server: {
        port: 5173,
        host: true,
        proxy: {
            // Route shop-specific requests directly to the Shop service in dev
            '/shop/graphql': {
                target: process.env.VITE_SHOP_URL || 'http://erp_system-shop-service-1:5003',
                changeOrigin: true,
                secure: false,
                rewrite: function (path) { return path.replace(/^\/shop\/graphql/, '/graphql'); },
            },
            // Gateway endpoints
            '/graphql': {
                target: gatewayUrl,
                changeOrigin: true,
                secure: false,
            },
            '/api': {
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
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    apollo: ['@apollo/client', 'graphql'],
                    dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
                },
            },
        },
    },
});
