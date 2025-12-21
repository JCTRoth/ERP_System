import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
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
        proxy: {
            '/graphql': {
                target: process.env.VITE_GATEWAY_URL || 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api': {
                target: process.env.VITE_GATEWAY_URL || 'http://localhost:4000',
                changeOrigin: true,
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
