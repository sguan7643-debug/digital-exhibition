import { createApp } from 'vue';
import App from './App.vue';
import { installLocalOnlyNetworkGuard } from './runtime/network-guard.js';
import './style.css';

installLocalOnlyNetworkGuard();
createApp(App).mount('#app');
