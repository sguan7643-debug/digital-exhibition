import { createApp } from 'vue';
import App from './App.vue';
import AppIcon from './components/AppIcon.vue';
import { createFeishuEntryAuthGuard } from './integration/feishu-entry-auth-guard.js';
import { normalizeAppBasePath } from './integration/app-base-path.js';
import { bootstrapEntryAuthorization } from './integration/entry-bootstrap.js';
import { installLocalOnlyNetworkGuard } from './runtime/network-guard.js';
import './style.css';
import './h5.css';

installLocalOnlyNetworkGuard();
const appBasePath = normalizeAppBasePath(import.meta.env.VITE_EXHIBITION_APP_BASE || import.meta.env.BASE_URL);
const entryAuthGuard = createFeishuEntryAuthGuard({
  appBasePath,
  fetchImpl: window.fetch.bind(window),
  redirect: href => window.location.assign(href)
});
await bootstrapEntryAuthorization({
  root: document.getElementById('app'),
  entryAuthGuard,
  mount: entryAuth => createApp(App, { entryAuth }).component('AppIcon', AppIcon).mount('#app')
});
