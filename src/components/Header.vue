<template>
    <div class="flex items-center border-b-2 border-solid border-stone-500 pb-1">
        <!-- 顶部路由链接 -->
        <router-link to="/authentication" class="nav-link">Authentication</router-link>
        <router-link to="/bridge" id="bridge-id" class="nav-link">Bridge</router-link>
        <!-- <router-link to="/transfer" class="nav-link">Transfer</router-link> -->
        <router-link to="/stats" class="nav-link">Stats</router-link>
        <router-link to="/relayInfo" class="nav-link">RelayInfo</router-link>
        <router-link to="/trace" class="nav-link">Trace</router-link>

        <div class="upload">
            <!-- 文件上传按钮 -->
            <div v-show="!allAccountInfo.realNameAccount.address">
                <div @click="triggerFileInput" class="uploadButton nav-link">Connect Wallet</div>
                <input
                    type="file"
                    ref="fileInput"
                    @change="handleFileChange"
                    id="privateKeyFile"
                    style="display: none" />
            </div>
            <!-- 展示账号详情 -->
            <div v-if="allAccountInfo.realNameAccount.address">
                <div class="uploadButton nav-link hide" @click="copyText">
                    {{ allAccountInfo.realNameAccount['address'] }}
                </div>
                <div class="moreinfo">
                    <ul>
                        <!-- <li>real name:{{ realNameAccount["address"] }}</li> -->
                        <li>anonymous account:</li>
                        <li>{{ allAccountInfo.anonymousAccount['address'] }}</li>
                        <hr />
                        <ul>
                            <li>temp account for chain 1:</li>
                            <li v-for="(item, index) in tempAccountInfo[0].selectedAccount" :key="index">
                                {{ item['address'] }}
                            </li>
                            <hr />
                            <li>temp account for chain 2:</li>
                            <li v-for="(item, index) in tempAccountInfo[1].selectedAccount" :key="index">
                                {{ item['address'] }}
                            </li>
                            <hr />
                            <li>temp account for chain 3:</li>
                            <li v-for="(item, index) in tempAccountInfo[2].selectedAccount" :key="index">
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
        <!-- 复制成功提示 -->
        <div v-if="copySuccessMessage" class="copy-message">
            {{ copySuccessMessage }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, toRef, type Ref } from 'vue';
import { useLoginStore } from '@/stores/modules/login';
import { storeToRefs } from 'pinia';
import { backendListen } from '@/ethers/eventListen/relayEventListen';

const loginStore = useLoginStore();
const { tempAccountInfo, allAccountInfo } = storeToRefs(loginStore);

// 文件处理方法
// 声明一个 ref 来存放该元素的引用
// 必须和模板里的 ref 同名
const fileInput = ref<HTMLInputElement | null>(null);
function triggerFileInput() {
    if (fileInput.value != null) fileInput.value.click();
}

function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0]; // 可选链
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
                // 打印当前正在处理的用户
                console.log('current user:', file.name);
                // 处理登录账号格式, 使用socket连接到服务器
                if (![1, 2, 102].includes(lines.length)) throw new Error('上传文件格式错误');
                if (lines.length === 1) lines[1] = lines[0];
                await loginStore.processAccount(lines);
                console.log('login in success');
                // 更改网页title
                document.title = file.name.replace('account', '').replace('.txt', '');
                // relay listens hash, pre relay info, pre app info
                await backendListen();
                console.log('backend listen success: relay listens hash, pre relay info, pre app info');
                // 提取数字, 为validator询问做准备
                let number = file.name.match(/\d+/g);
                let userNumber = toRef(useLoginStore(), 'userNumber');
                if (number && userNumber) userNumber.value = Number(number[0]);
            } catch (e) {
                console.log(e);
            }
        }
    };
    reader.readAsText(file);
}

// 登录之后, 点击按钮复制文本
let copySuccessMessage = ref('');
async function copyText() {
    try {
        let text = tempAccountInfo.value[0].selectedAccount.at(-1)?.address;
        if (!text) text = '';
        await navigator.clipboard.writeText(text);
        copySuccessMessage.value = '地址已复制到剪贴板！';
        setTimeout(() => {
            copySuccessMessage.value = '';
        }, 2000);
    } catch (err) {
        console.error('复制失败: ', err);
        copySuccessMessage.value = '复制地址失败。';
        setTimeout(() => {
            copySuccessMessage.value = '';
        }, 2000);
    }
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

.copy-message {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #4caf50;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: opacity 0.3s ease;
    /* 确保显示 */
    display: block;
    opacity: 1;
    z-index: 1000; /* 确保在最上层 */
}
</style>
