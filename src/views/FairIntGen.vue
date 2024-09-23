<template>
    <hr />

    <div class="demo-collapse">
        <el-collapse v-model="activeNames">
            <!-- chains -->
            <el-collapse-item v-for="(item, index) in datas" :key="index" :title="'Chain ' + (index + 1)"
                :name="index + 1" class="custom-collapse-item">
                <div class="status-container">
                    <FairIntTable :datas="item" :relays="relays[index]" :oneChainSendInfo="sendInfo[index]"
                        :oneChainTempAccount="tempAccountInfo[index]" :chainId="index" />
                </div>
            </el-collapse-item>

            <!-- verify signature -->
            <el-collapse-item title="Verify Signature" name="4">
                <!-- <div>verify sig</div> -->
                <!-- 单纯验证签名 -->
                <div id="verifySig">
                    <el-input v-model="c" class="input-spacing" placeholder="c值" />
                    <el-input v-model="s" class="input-spacing" placeholder="s值" />
                    <el-input v-model="t" class="input-spacing" placeholder="t值" />
                    <el-button type='primary' round plain @click="verifySignature">验证签名</el-button>
                    <p v-if="isVeri">验证结果: {{ verificationResult }}</p>
                </div>

            </el-collapse-item>
        </el-collapse>
    </div>
</template>

<script setup lang="ts">
import { getAccountInfo } from '@/api';
import { getCurrentBlockTime, getFairIntGen } from '@/ethers/contract';
import { provider } from '@/ethers/provider';
import { listenResHash, stopableListenResNum, stopableListenResReupload } from '@/ethers/timedListen';
import { getHash, getRandom } from '@/ethers/util';
import { socketMap } from '@/socket';
import { appSendInitData } from '@/socket/applicantEvent';
import { useApplicantStore } from '@/stores/modules/applicant';
import { useLoginStore } from '@/stores/modules/login';
import { ethers, Wallet } from 'ethers';
import { storeToRefs } from 'pinia';
import { computed, onBeforeMount, onMounted, reactive, readonly, ref, watch, watchEffect } from 'vue';
import { setNextRelayInfo } from './FairIntegerGen/updateNextRelay';
import FairIntTable from './FairIntegerGen/FairIntTable.vue';

// 从store中导入数据
let applicantStore = useApplicantStore();
let datas = applicantStore.datas;
let relays = applicantStore.relays;
const { resetCurrentStep } = applicantStore;
let { relayIndex } = storeToRefs(applicantStore);
const loginStore = useLoginStore();
const { chainLength, validatorAccount, sendInfo, allAccountInfo, tempAccountInfo } = loginStore;
const totalStep = chainLength + 3;

// 折叠面板
const activeNames = ref(['1']);
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

.status-container>* {
    transform: scale(0.98);
    /* 缩小到80% */
    transform-origin: center center;
    /* 设置缩放原点 */
}

.status-container>* {
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
    margin-right: 10px;
}
</style>
