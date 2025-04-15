<template>
    <div class="scale-container">
        <div class="scale-content">
            <!-- 原有内容放在这里 -->
            <Header></Header>
            <router-view v-slot="{ Component }">
                <component :is="Component" />
            </router-view>
        </div>
    </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import Header from '@/components/Header.vue';
import { onMounted, onUnmounted } from 'vue';
// 缩放功能
const setScale = () => {
    const container = document.querySelector('.scale-container') as HTMLDivElement;
    const content = document.querySelector('.scale-content') as HTMLDivElement;

    if (!container || !content) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const designWidth = 1920; // 设计稿宽度
    const designHeight = 1080; // 设计稿高度

    const scaleX = containerWidth / designWidth;
    const scaleY = containerHeight / designHeight;
    let scale = Math.min(scaleX, scaleY);
    let minScale = 0.5,
        maxScale = 1.2;
    scale = Math.min(Math.max(scaleX, minScale), maxScale);

    // content.style.transform = `scale(${scale})`;

    // 居中内容
    const scaledWidth = designWidth * scale;
    const scaledHeight = designHeight * scale;

    const marginLeft = (containerWidth - scaledWidth) / 2;
    // console.log(marginLeft, scale);
    // const marginTop = (containerHeight - scaledHeight) / 2;

    content.style.transform = `translateX(${marginLeft}px) scale(${scale})`;
    content.style.left = '0px';
    // content.style.left = `${marginLeft}px`;
    // content.style.top = `${marginTop}px`;
};

// 生命周期钩子
onMounted(() => {
    setScale();
    window.addEventListener('resize', setScale);
});

onUnmounted(() => {
    window.removeEventListener('resize', setScale);
});
</script>

<style>
/* 引入全局样式 */
@import '@/assets/global.css';
/* #app {
    width: 90%;
    margin: 0 auto;
} */

/* 缩放容器样式 */
.scale-container {
    width: 100vw;
    height: 100vh;
    overflow: auto;
}

.scale-content {
    position: absolute;
    width: 1920px; /* 设计稿宽度 */
    height: 1080px; /* 设计稿高度 */
    transform-origin: 0 0;
}

/* 移除原有的宽度限制 */
#app {
    width: 90%;
    height: 100vh;
    margin: 0;
    padding: 0;
}

/* 确保body和html没有多余的边距 */
html,
body {
    margin: 0;
    padding: 0;
    overflow: auto;
}
</style>
