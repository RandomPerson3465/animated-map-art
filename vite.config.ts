import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/animated-map-art/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                combine: resolve(__dirname, 'combine.html')
            }
        }
    }
});