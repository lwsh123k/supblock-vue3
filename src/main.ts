import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import App from './App.vue';
import router from './router';
import '@/assets/index.css'; // tailwind放到element plus之前
import 'element-plus/dist/index.css';
// import * as P from '@/ethers/eventListen';

const app = createApp(App);

app.use(router);
app.use(ElementPlus);
app.use(createPinia());

app.mount('#app');
