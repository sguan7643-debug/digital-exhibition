import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { feishuReadOnlyProxy } from './server/feishu-vite-plugin.mjs';

function normalizeAppBase(value) {
  const segment = String(value || '/test2/').trim().replace(/^\/+|\/+$/g, '');
  return segment ? `/${segment}/` : '/';
}

export default defineConfig(({ command, mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), 'FEISHU_');
  const clientEnv = loadEnv(mode, process.cwd(), 'VITE_');
  const appBase = normalizeAppBase(clientEnv.VITE_EXHIBITION_APP_BASE);
  const approvalBackendUrl = serverEnv.FEISHU_APPROVAL_BACKEND_URL || 'http://10.151.23.119:28080';
  return ({
  base: appBase,
  plugins: [vue(), feishuReadOnlyProxy({
    appId: serverEnv.FEISHU_APP_ID,
    appSecret: serverEnv.FEISHU_APP_SECRET,
    baseToken: serverEnv.FEISHU_BASE_TOKEN,
    redirectUri: serverEnv.FEISHU_OAUTH_REDIRECT_URI || 'http://127.0.0.1:4173/api/v1/auth/feishu/callback',
    scopes: serverEnv.FEISHU_OAUTH_SCOPES,
    allowedAppLaunchHosts: serverEnv.FEISHU_APP_LAUNCH_ALLOWED_HOSTS || 'ai.smartwork.com,ead.smartwork.com,rpa.smartwork.com,tools.cnooc.com,oisamrtwork.com,bi.cnooc.com,data.cnooc.com,cnooc.com',
    recordWriteEnabled: serverEnv.FEISHU_TEST_WRITE_ENABLED === '1'
  })],
  esbuild: false,
  resolve: {
    alias: {
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
    strictPort: true,
    proxy: {
      '/api/processInstanceStart': {
        target: approvalBackendUrl,
        changeOrigin: true
      }
    },
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
