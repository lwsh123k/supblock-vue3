import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            buffer: require.resolve('buffer/'),
            assert: require.resolve('assert/'),
            process: require.resolve('process/browser'),
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        open: true
    }
});
