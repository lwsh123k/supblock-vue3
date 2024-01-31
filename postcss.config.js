export default {
    // vite预设postcss支持, 只需要postcss.config.js配置文件即可
    // tailwind使用postcss中的autoprefixer插件适配不同浏览器支持
    plugins: {
        tailwindcss: {},
        autoprefixer: {}
    }
};
