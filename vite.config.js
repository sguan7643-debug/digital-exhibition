import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  esbuild: false,
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-browser.prod.js'
    }
  },
  build: {
    minify: false
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true
  }
});
