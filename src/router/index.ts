import { createRouter, createWebHistory } from 'vue-router';
import Transfer from '../views/Transfer.vue';
import Bridge from '../views/Bridge.vue';
import FairIntGen from '@/views/FairIntGen.vue';
import Stats from '@/views/Stats.vue';
import RelayInfo from '@/views/RelayInfo.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/authentication'
        },
        {
            path: '/bridge',
            component: Bridge
        },
        {
            path: '/transfer',
            component: Transfer
        },
        {
            path: '/authentication',
            component: FairIntGen
            // meta: {
            //     KeepAlive: true
            // }
        },
        {
            path: '/stats',
            component: Stats
        },
        {
            path: '/relayInfo',
            component: RelayInfo
        }
    ]
});

export default router;
