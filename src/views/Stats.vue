<template>
    <div>
        <v-chart class="chart" :option="option" :loading="loading" :loadingOptions="loadingOptions" />
    </div>
</template>

<script setup lang="ts">
import 'echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';
import { ref, provide, onMounted, shallowRef } from 'vue';
import { useApplicantStore } from '@/stores/modules/applicant';
import { getData } from '@/api/chartData';

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent]);

const loading = shallowRef(false);
const loadingOptions = {
    text: '加载中...',
    color: '#4ea397',
    maskColor: 'rgba(255, 255, 255, 0.4)'
};

provide(THEME_KEY, 'dark');

const option = ref({
    title: {
        text: 'Gas Statistics',
        left: 'center'
    },
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    },
    legend: {
        top: '10%'
    },
    grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '20%',
        containLabel: true
    },
    dataset: {
        dimensions: [
            'item',
            'applicant hash gas',
            'applicant num gas',
            'applicant reupload gas',
            'relay hash gas',
            'relay num gas',
            'relay reupload gas'
        ],
        source: []
    },
    xAxis: {
        type: 'category'
    },
    yAxis: {
        type: 'value',
        name: 'Gas'
    },
    series: [
        {
            type: 'bar',
            stack: 'applicant',
            name: 'applicant hash gas'
        },
        {
            type: 'bar',
            stack: 'applicant',
            name: 'applicant num gas'
        },
        {
            type: 'bar',
            stack: 'applicant',
            name: 'applicant reupload gas'
        },
        {
            type: 'bar',
            stack: 'relay',
            name: 'relay hash gas'
        },
        {
            type: 'bar',
            stack: 'relay',
            name: 'relay num gas'
        },
        {
            type: 'bar',
            stack: 'relay',
            name: 'relay reupload gas'
        }
    ]
});

const applicantStore = useApplicantStore();

async function fetchData() {
    try {
        loading.value = true;
        const datas = applicantStore.datas[0];
        if (!datas?.length) {
            console.warn('No data available');
            return;
        }

        const reqData = datas.slice(0, 3).map((val) => ({
            addressA: val[0].address,
            hashA: val[0].hash,
            addressB: val[1].address,
            hashB: val[1].hash
        }));

        const dataset = await getData(reqData);
        option.value.dataset = dataset;
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    fetchData();
});
</script>

<style scoped>
.chart {
    width: 80%;
    height: 800px;
    margin: 20px auto;
}
</style>
