<template>
    <!-- 顶部导航栏 -->
    <Header></Header>

    <!-- 路由匹配到的组件将渲染在这里 -->
    <!-- 下面代码等价于<RouterView /> -->
    <router-view v-slot="{ Component }"> </router-view>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import Header from '@/components/Header.vue';
import FairIntGenCard from './views/FairIntegerGen/FairIntGenCard.vue';
import Stats from './views/Stats.vue';
</script>

<style>
/* 引入全局样式 */
@import '@/assets/global.css';
#app {
    width: 90%;
    margin: 0 auto;
}
</style>
