import { createRouter, createWebHistory } from 'vue-router';
import Transfer from '../views/Transfer.vue';
import Bridge from '../views/Bridge.vue';
import FairIntGen from '@/views/FairIntegerGen/FairIntGen.vue';
import Stats from '@/views/Stats.vue';
import RelayInfo from '@/views/RelayInfo.vue';
import Trace from '@/views/ReverseTrack/Trace.vue';

// 定义路由元数据的类型
declare module 'vue-router' {
    interface RouteMeta {
        title?: string;
    }
}

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
        // {
        //     path: '/transfer',
        //     component: Transfer
        // },
        {
            path: '/authentication',
            component: FairIntGen,
            meta: {
                title: 'Authentication'
            }
            // meta: {
            //     KeepAlive: true
            // }
        },
        {
            path: '/stats',
            component: Stats,
            meta: {
                title: 'Stats'
            }
        },
        {
            path: '/relayInfo',
            component: RelayInfo,
            meta: {
                title: 'Relay Info'
            }
        },
        {
            path: '/trace',
            component: Trace,
            meta: {
                title: 'Trace'
            }
        }
    ]
});

// 全局导航守卫
router.beforeEach((to, from, next) => {
    // 更新页面标题
    const title = to.meta.title ? to.meta.title : 'Supblock';
    document.title = title;
    next();
});

export default router;
