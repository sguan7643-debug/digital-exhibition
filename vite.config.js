import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ command }) => ({
  plugins: [vue()],
  esbuild: false,
  resolve: {
    alias: {
      // Vue's production browser build omits the HMR runtime. Use the
      // development browser build while Vite is serving source modules, then
      // keep the smaller production runtime for the deployment bundle.
      vue: command === 'serve'
        ? 'vue/dist/vue.esm-browser.js'
        : 'vue/dist/vue.esm-browser.prod.js'
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
}));
