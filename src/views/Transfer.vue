<template>
    <div class="transfer">
        <el-container>
            <!-- 桥接界面 -->
            <el-card style="margin: 50px auto">
                <el-form ref="form" :model="form" :label-position="labelPosition" label-width="150px">
                    <!-- 发送金额 -->
                    <el-form-item label="send">
                        <el-input v-model="form.amount" placeholder="输入金额">
                            <template slot="append">ETH</template>
                        </el-input>
                    </el-form-item>

                    <!-- 从哪个网络 -->
                    <el-form-item label="from">
                        <el-select v-model="form.from" placeholder="选择网络">
                            <el-option label="Ethereum Mainnet" value="ethereum"></el-option>
                            <!-- 其他网络选项 -->
                        </el-select>
                    </el-form-item>

                    <!-- 到哪个网络 -->
                    <el-form-item label="to">
                        <el-select v-model="form.to" placeholder="选择网络">
                            <el-option label="Arbitrum One" value="arbitrum"></el-option>
                            <!-- 其他网络选项 -->
                        </el-select>
                    </el-form-item>

                    <!-- 连接钱包按钮 -->
                    <el-form-item>
                        <el-button type="primary">连接钱包</el-button>
                    </el-form-item>
                </el-form>
            </el-card>
        </el-container>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const labelPosition = ref("right");
const form = {
    amount: "",
    from: "",
    to: "",
};
</script>

<style scoped>
.transfer {
    margin: 0 auto;
}
</style>
