import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { feishuReadOnlyProxy } from './server/feishu-vite-plugin.mjs';

export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), 'FEISHU_');
  return ({
  plugins: [vue(), feishuReadOnlyProxy({
    appId: serverEnv.FEISHU_APP_ID,
    appSecret: serverEnv.FEISHU_APP_SECRET,
    baseToken: serverEnv.FEISHU_BASE_TOKEN
  })],
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
    strictPort: true,
    fs: {
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/server/**', '**/tools/**']
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true
  }
  });
});
