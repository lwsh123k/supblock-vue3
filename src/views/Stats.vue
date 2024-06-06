<template>
    <div>
        <v-chart class="chart" :option="option" :loading="loading" :loadingOptions="loadingOptions" />
    </div>
</template>

<script setup lang="ts">
import 'echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';
import { ref, provide, onMounted, shallowRef, onBeforeMount } from 'vue';
import requests from '@/api/requests';
import { useApplicantStore } from '@/stores/modules/applicant';
import { getData } from '@/api/chartData';

use([CanvasRenderer, PieChart, TitleComponent, TooltipComponent, LegendComponent]);
const loading = shallowRef(false);
const loadingOptions = {
    text: 'Loading…',
    color: '#4ea397',
    maskColor: 'rgba(255, 255, 255, 0.4)'
};
provide(THEME_KEY, 'dark');
let option = ref({
    dataset: {
        dimensions: ['item', 'applicant hash gas', 'applicant num gas', 'relay hash gas', 'relay num gas'],
        source: [['relay 0'], ['relay 1']]
    },
    xAxis: {
        type: 'category',
        data: Array.from({ length: 6 }, (v, i) => `relay ${i}`)
    },
    yAxis: {},
    legend: {
        data: ['applicant hash gas', 'applicant num gas', 'relay hash gas', 'relay num gas']
    },
    series: [
        {
            type: 'bar',
            stack: 'total',
            label: {
                show: true,
                position: 'inside'
            }
        },
        {
            type: 'bar',
            stack: 'total',
            label: {
                show: true,
                position: 'inside'
            }
        },
        {
            type: 'bar',
            stack: 'total',
            label: {
                show: true,
                position: 'inside'
            }
        },
        {
            type: 'bar',
            stack: 'total',
            label: {
                show: true,
                position: 'inside'
            }
        }
    ]
});

// 获取gas相关数据
let applicantStore = useApplicantStore();
let datas = applicantStore.datas;
interface Account {
    addressA: string;
    hashA: string;
    addressB: string;
    hashB: string;
}
onBeforeMount(async () => {
    console.log('requesting data...');
    let reqData: Account[] = [];
    for (let val of datas) {
        let temp: Account = {
            addressA: val[0].address,
            hashA: val[0].hash,
            addressB: val[1].address,
            hashB: val[1].hash
        };
        reqData.push(temp);
    }
    let dataset = await getData(reqData);
    console.log(dataset);
    option.value.dataset = dataset;
});
</script>

<style scoped>
.chart {
    width: 80%;
    height: 800px;
    margin: 20px auto;
}
</style>
