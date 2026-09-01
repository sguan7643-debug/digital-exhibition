import { createApp } from 'vue';
import App from './App.vue';
import AppIcon from './components/AppIcon.vue';
import { installLocalOnlyNetworkGuard } from './runtime/network-guard.js';
import './style.css';

installLocalOnlyNetworkGuard();
createApp(App).component('AppIcon', AppIcon).mount('#app');
