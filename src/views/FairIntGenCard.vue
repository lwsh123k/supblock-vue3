<template>
    <div class="container m-7 mx-auto bg-white p-8 pt-3 shadow">
        <h1 class="my-5 text-center text-3xl">Fair Integer Generation Status</h1>

        <el-carousel :autoplay="false" :loop="false" height="500px" arrow="always">
            <el-carousel-item v-for="user in users" :key="user.name">
                <!-- 请求者 -->
                <el-card>
                    <h2 class="text-center text-3xl">appliacnt</h2>
                    <div class="text-xl">
                        <!-- hash上传部分 -->
                        <div class="my-4">
                            <span class="font-bold">Hash:</span>
                            <span class="ml-2">{{ user.hash }}</span>
                        </div>
                        <!-- 随机数上传部分 -->
                        <div class="my-5">
                            <span class="font-bold">Random Number:</span>
                            <span class="ml-2">{{ user.randomNumber }}</span>

                            <el-button class="" type="primary" @click="editRandomNumber(user.name)"
                                >Edit Random Number</el-button
                            >
                        </div>
                        <!-- 状态栏 -->
                        <div class="status my-4">Status: {{ user.status }}</div>
                        <el-progress :percentage="user.progress"></el-progress>
                    </div>
                </el-card>
            </el-carousel-item>
        </el-carousel>
    </div>
</template>

<script setup lang="ts">
const users = [
    { name: 'User A', hash: 'N/A', randomNumber: 'N/A', status: 'Waiting for Action', progress: 50 },
    { name: 'User B', hash: 'N/A', randomNumber: 'N/A', status: 'Waiting for Random Number', progress: 50 }
    // ... 其他用户数据
];
const totalRandomSum = 'N/A';
function editRandomNumber(userName: string) {
    // 编辑指定用户的随机数的逻辑
    console.log(`Edit Random Number for ${userName}`);
}
</script>

<style scoped></style>
