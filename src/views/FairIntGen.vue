<template>
    <hr />

    <div class="demo-collapse">
        <el-collapse v-model="activeNames">
            <!-- chains -->
            <el-collapse-item
                v-for="(item, index) in datas"
                :key="index"
                :title="'Chain ' + (index + 1)"
                :name="index + 1"
                class="custom-collapse-item">
                <div class="status-container">
                    <FairIntTable
                        :datas="item"
                        :relays="relays[index]"
                        :oneChainSendInfo="sendInfo[index]"
                        :oneChainTempAccount="tempAccountInfo[index]"
                        :chainId="index" />
                </div>
            </el-collapse-item>

            <!-- verify signature -->
            <el-collapse-item title="Verify Signature" class="form-container">
                <!-- <div>verify sig</div> -->
                <!-- 单纯验证签名 -->
                <div id="verifySig">
                    <el-input v-model="blindedMessage.c" class="input-spacing" placeholder="c值" />
                    <el-input v-model="blindedMessage.s" class="input-spacing" placeholder="s值" />
                    <br />
                    <el-input v-model="chain0.t" class="input-spacing" placeholder="t1值" />
                    <el-input v-model="chain1.t" class="input-spacing" placeholder="t2值" />
                    <el-input v-model="chain2.t" class="input-spacing" placeholder="t3值" />
                    <br />
                    <div class="flex flex-row items-center space-x-4">
                        <button
                            class="input-spacing w-5 rounded bg-sky-500 px-4 py-2 text-lg font-bold text-white hover:bg-blue-600 md:w-auto"
                            @click="verifySigFunc">
                            verify sig
                        </button>
                        <p class="text-xl font-bold">verification result: {{ verifyResultMessage }}</p>
                    </div>
                </div>
            </el-collapse-item>
        </el-collapse>
    </div>
</template>

<script setup lang="ts">
import { useApplicantStore } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';
import { storeToRefs } from 'pinia';
import { computed, onBeforeMount, onMounted, reactive, readonly, ref, watch, watchEffect } from 'vue';
import FairIntTable from './FairIntegerGen/FairIntTable.vue';
import { useVerifyStore } from '@/stores/modules/verifySig';
// 从store中导入数据
let applicantStore = useApplicantStore();
let datas = applicantStore.datas;
let relays = applicantStore.relays;
const loginStore = useLoginStore();
const { chainLength, validatorAccount, sendInfo, allAccountInfo, tempAccountInfo } = loginStore;

const verifySigStore = useVerifyStore();
const { blindedMessage, chain0, chain1, chain2 } = storeToRefs(verifySigStore);
// 折叠面板
const activeNames = ref(['1']);

// 签名验证
const hasVerify = ref(false);
const verifyResult = ref(false);
function verifySigFunc() {
    let res = verifySigStore.verifySigFunc();
    hasVerify.value = true;
    verifyResult.value = res;
    console.log(`has verify: ${hasVerify.value}, verify result: ${verifyResult.value}`);
}

// 展示验证结果
const verifyResultMessage = computed(() => {
    if (hasVerify.value) {
        return verifyResult.value === true ? 'valid signature' : 'invalid signature';
    }
    return '';
});
</script>

<style scoped>
.demo-collapse {
    margin-top: 20px;
}

/* 设置 Element Plus 表格行高 */
/* :deep(.el-table .el-table__row) {
    height: 100px;
} */
/* 右下角显示按钮 */
.status-container {
    position: relative;
}

/* .table-buttons {
    position: absolute;
    right: 0px;
    bottom: -60px;
    margin: 10px;
} */

.status-container {
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: auto;
}

.status-container > * {
    transform: scale(0.98);
    /* 缩小到80% */
    transform-origin: center center;
    /* 设置缩放原点 */
}

.status-container > * {
    width: 100%;
    height: 100%;
}

/* 折叠面板style */
.el-collapse-item {
    margin-bottom: 5px;
}

.el-collapse-item__header {
    background-color: #007bff;
    color: white;
    padding: 10px;
    border-radius: 4px 4px 0 0;
    font-size: large;
}

.el-collapse-item__content {
    padding: 10px;
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 0 0 4px 4px;
}

/* 使用深度作用选择器来设置所有标题的样式 */
:deep(.el-collapse-item__header) {
    padding: 20px;
    font-weight: bold;
    font-size: 20px;
    /* 设置字号 */
    height: 80px;
    /* 设置标题高度 */
}

/*让三个输入框之间有间距*/
.input-spacing {
    width: 240px;
    margin: 10px 16px;
    border-radius: 4px;
}

/* verify sig pari  */
.form-container {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    background-color: #f9f9f9;
}
</style>
