<template>
    <div class="flex items-center border-b-2 border-solid border-stone-500 pb-1">
        <!-- 顶部路由链接 -->
        <router-link to="/authentication" class="nav-link">Authentication</router-link>
        <router-link to="/bridge" class="nav-link" exact>Bridge</router-link>
        <router-link to="/transfer" class="nav-link">Transfer</router-link>

        <div class="upload">
            <!-- 文件上传按钮 -->
            <div v-show="!accountInfo.realNameAccount.address">
                <div @click="triggerFileInput" class="uploadButton nav-link">Connect Wallet</div>
                <input type="file" ref="fileInput" @change="handleFileChange" style="display: none" />
            </div>
            <!-- 展示账号详情 -->
            <div v-if="accountInfo.realNameAccount.address">
                <div class="uploadButton nav-link hide">
                    {{ accountInfo.realNameAccount['address'] }}
                </div>
                <div class="moreinfo">
                    <ul>
                        <!-- <li>real name:{{ realNameAccount["address"] }}</li> -->
                        <li>anonymous:</li>
                        <li>{{ accountInfo.anonymousAccount['address'] }}</li>
                        <ul>
                            <li>temp:</li>
                            <li v-for="(item, index) in accountInfo.selectedAccount" :key="index">
                                {{ item['address'] }}
                            </li>
                        </ul>
                    </ul>
                </div>
            </div>
        </div>

        <!-- 详情弹框 -->
        <!-- <el-popover placement="bottom" width="200" v-model="popoverVisible" trigger="click">
            <p>用户名: {{ 1 }}</p>
            <p>邮箱: {{ 1 }}</p>
            <p>其他信息...</p>
            <el-avatar slot="reference" src="path_to_avatar_image.jpg"></el-avatar>
        </el-popover> -->
    </div>
</template>

<script setup lang="ts">
import { ref, type Ref } from 'vue';
import { useLoginStore } from '@/stores/login';
import { storeToRefs } from 'pinia';

const popoverVisible = ref(true);
const loginStore = useLoginStore();
const { chainLength, accountInfo, validatorAccount, sendInfo } = storeToRefs(loginStore);

// 文件处理方法
// 声明一个 ref 来存放该元素的引用
// 必须和模板里的 ref 同名
const fileInput = ref<HTMLInputElement | null>(null);
function triggerFileInput() {
    if (fileInput.value != null) fileInput.value.click();
}

function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files![0]; // 非空断言??
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
        const fileContent = e.target?.result;
        if (typeof fileContent === 'string') {
            const lines = fileContent.split('\r\n');
            lines.pop();
            try {
                if (![1, 2, 102].includes(lines.length)) throw new Error('上传文件格式错误');
                if (lines.length === 1) lines[1] = lines[0];
                await loginStore.processAccount(lines);
                // 开启监听
                // tokenChain.listenAppData();
                // tokenChain.listenPreRelayData();
            } catch (e) {
                console.log(e);
            }
        }
    };
    reader.readAsText(file);
}
</script>

<style scoped>
/* 每一个导航项 */
.nav-link {
    box-sizing: border-box;
    height: 70px;
    text-decoration: none;
    text-align: center;
    color: #898988;
    padding: 0px 50px; /* padding上下为0 + 文字高度, 使内容垂直居中 */
    margin: 5px;
    border-radius: 8px;
    transition: background-color 0.5s; /* 颜色变化过渡效果 */
    font: normal 700 20px/70px 'Inter Bold';
}

.nav-link:hover {
    background-color: #3f3f3f;
    color: #e8e7e3;
}

.upload {
    position: relative;
    margin-left: auto;
    width: fit-content; /* 设置父元素宽度为子元素所占用的空间 */
}

/* 文件上传按钮 */
.uploadButton {
    cursor: pointer;
    border-radius: 15px;
    height: 70px;
    background-color: rgba(107, 83, 37, 0.062);
}
.uploadButton:hover {
    background-color: rgb(229, 180, 243);
}

/* 账号详情悬浮框 */
.moreinfo {
    display: none;
    position: absolute;
    right: 0px;
    background-color: #3f3f3f;
    width: 100%;
    border-radius: 15px;
    z-index: 99;
}
.hide:hover + .moreinfo {
    display: block;
}

/* 账号详情li细节 */
.moreinfo ul li {
    margin: 10px;
    color: white;
    font: normal 400 16px 'Inter Bold';
}

/* 当链接处于激活状态时应用的样式 */
.router-link-active,
.router-link-exact-active {
    background-color: #3f3f3f;
    color: #e8e7e3;
}
</style>
