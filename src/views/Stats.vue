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

// 第一阶段的固定值（未优化前）
const stage1FixedValues: { [key: string]: number } = {
    'applicant hash gas': 150000,
    'applicant num gas': 120000,
    'applicant reupload gas': 100000,
    'relay hash gas': 140000,
    'relay num gas': 110000,
    'relay reupload gas': 90000
};

const option = ref({
    title: {
        text: 'Gas Optimization Statistics',
        left: 'center'
    },
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    },
    legend: {
        top: '10%',
        data: [
            'applicant hash gas',
            'applicant num gas',
            'applicant reupload gas',
            'relay hash gas',
            'relay num gas',
            'relay reupload gas'
        ]
    },
    grid: [
        {
            left: '5%',
            width: '25%',
            bottom: '3%',
            top: '20%',
            containLabel: true
        },
        {
            left: '38%',
            width: '25%',
            bottom: '3%',
            top: '20%',
            containLabel: true
        },
        {
            right: '5%',
            width: '25%',
            bottom: '3%',
            top: '20%',
            containLabel: true
        }
    ],
    dataset: {
        dimensions: [
            'item',
            'applicant hash gas 1',
            'applicant num gas 1',
            'applicant reupload gas 1',
            'relay hash gas 1',
            'relay num gas 1',
            'relay reupload gas 1',
            'applicant hash gas 2',
            'applicant num gas 2',
            'applicant reupload gas 2',
            'relay hash gas 2',
            'relay num gas 2',
            'relay reupload gas 2',
            'applicant hash gas 3',
            'applicant num gas 3',
            'applicant reupload gas 3',
            'relay hash gas 3',
            'relay num gas 3',
            'relay reupload gas 3'
        ],
        source: [] as (string | number)[][]
    },
    xAxis: [
        {
            type: 'category',
            gridIndex: 0,
            axisLabel: {
                formatter: function (value: string) {
                    return 'Stage 0';
                }
            }
        },
        {
            type: 'category',
            gridIndex: 1,
            axisLabel: {
                formatter: function (value: string) {
                    return 'Stage 1';
                }
            }
        },
        {
            type: 'category',
            gridIndex: 2,
            axisLabel: {
                formatter: function (value: string) {
                    return 'Stage 2';
                }
            }
        }
    ],
    yAxis: [
        {
            type: 'value',
            name: 'Gas',
            gridIndex: 0
        },
        {
            type: 'value',
            name: 'Gas',
            gridIndex: 1
        },
        {
            type: 'value',
            name: 'Gas',
            gridIndex: 2
        }
    ],
    series: [
        // Stage 1 系列
        {
            type: 'bar',
            stack: 'applicant 1',
            name: 'applicant hash gas',
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: {
                borderRadius: [4, 4, 0, 0]
            },
            encode: {
                x: 'item',
                y: 'applicant hash gas 1'
            }
        },
        {
            type: 'bar',
            stack: 'applicant 1',
            name: 'applicant num gas',
            xAxisIndex: 0,
            yAxisIndex: 0,
            encode: {
                x: 'item',
                y: 'applicant num gas 1'
            }
        },
        {
            type: 'bar',
            stack: 'applicant 1',
            name: 'applicant reupload gas',
            xAxisIndex: 0,
            yAxisIndex: 0,
            encode: {
                x: 'item',
                y: 'applicant reupload gas 1'
            }
        },
        {
            type: 'bar',
            stack: 'relay 1',
            name: 'relay hash gas',
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: {
                borderRadius: [4, 4, 0, 0]
            },
            encode: {
                x: 'item',
                y: 'relay hash gas 1'
            }
        },
        {
            type: 'bar',
            stack: 'relay 1',
            name: 'relay num gas',
            xAxisIndex: 0,
            yAxisIndex: 0,
            encode: {
                x: 'item',
                y: 'relay num gas 1'
            }
        },
        {
            type: 'bar',
            stack: 'relay 1',
            name: 'relay reupload gas',
            xAxisIndex: 0,
            yAxisIndex: 0,
            encode: {
                x: 'item',
                y: 'relay reupload gas 1'
            }
        },
        // Stage 2 系列
        {
            type: 'bar',
            stack: 'applicant 2',
            name: 'applicant hash gas',
            xAxisIndex: 1,
            yAxisIndex: 1,
            itemStyle: {
                borderRadius: [4, 4, 0, 0]
            },
            encode: {
                x: 'item',
                y: 'applicant hash gas 2'
            }
        },
        {
            type: 'bar',
            stack: 'applicant 2',
            name: 'applicant num gas',
            xAxisIndex: 1,
            yAxisIndex: 1,
            encode: {
                x: 'item',
                y: 'applicant num gas 2'
            }
        },
        {
            type: 'bar',
            stack: 'applicant 2',
            name: 'applicant reupload gas',
            xAxisIndex: 1,
            yAxisIndex: 1,
            encode: {
                x: 'item',
                y: 'applicant reupload gas 2'
            }
        },
        {
            type: 'bar',
            stack: 'relay 2',
            name: 'relay hash gas',
            xAxisIndex: 1,
            yAxisIndex: 1,
            itemStyle: {
                borderRadius: [4, 4, 0, 0]
            },
            encode: {
                x: 'item',
                y: 'relay hash gas 2'
            }
        },
        {
            type: 'bar',
            stack: 'relay 2',
            name: 'relay num gas',
            xAxisIndex: 1,
            yAxisIndex: 1,
            encode: {
                x: 'item',
                y: 'relay num gas 2'
            }
        },
        {
            type: 'bar',
            stack: 'relay 2',
            name: 'relay reupload gas',
            xAxisIndex: 1,
            yAxisIndex: 1,
            encode: {
                x: 'item',
                y: 'relay reupload gas 2'
            }
        },
        // Stage 3 系列
        {
            type: 'bar',
            stack: 'applicant 3',
            name: 'applicant hash gas',
            xAxisIndex: 2,
            yAxisIndex: 2,
            itemStyle: {
                borderRadius: [4, 4, 0, 0]
            },
            encode: {
                x: 'item',
                y: 'applicant hash gas 3'
            }
        },
        {
            type: 'bar',
            stack: 'applicant 3',
            name: 'applicant num gas',
            xAxisIndex: 2,
            yAxisIndex: 2,
            encode: {
                x: 'item',
                y: 'applicant num gas 3'
            }
        },
        {
            type: 'bar',
            stack: 'applicant 3',
            name: 'applicant reupload gas',
            xAxisIndex: 2,
            yAxisIndex: 2,
            encode: {
                x: 'item',
                y: 'applicant reupload gas 3'
            }
        },
        {
            type: 'bar',
            stack: 'relay 3',
            name: 'relay hash gas',
            xAxisIndex: 2,
            yAxisIndex: 2,
            itemStyle: {
                borderRadius: [4, 4, 0, 0]
            },
            encode: {
                x: 'item',
                y: 'relay hash gas 3'
            }
        },
        {
            type: 'bar',
            stack: 'relay 3',
            name: 'relay num gas',
            xAxisIndex: 2,
            yAxisIndex: 2,
            encode: {
                x: 'item',
                y: 'relay num gas 3'
            }
        },
        {
            type: 'bar',
            stack: 'relay 3',
            name: 'relay reupload gas',
            xAxisIndex: 2,
            yAxisIndex: 2,
            encode: {
                x: 'item',
                y: 'relay reupload gas 3'
            }
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

        const currentDataset = await getData(reqData);

        // 创建新的数据源
        let newSource: (string | number)[][] = [];

        // 我们只需要一行数据，因为我们使用了多个坐标系
        let newRow: (string | number)[] = ['item'];

        // Stage 1: 添加固定值（未优化前）
        newRow.push(
            stage1FixedValues['applicant hash gas'],
            stage1FixedValues['applicant num gas'],
            stage1FixedValues['applicant reupload gas'],
            stage1FixedValues['relay hash gas'],
            stage1FixedValues['relay num gas'],
            stage1FixedValues['relay reupload gas']
        );

        // Stage 2: 计算当前值的平均值（从API获取）
        let stage2Values: { [key: string]: number } = {
            'applicant hash gas': 0,
            'applicant num gas': 0,
            'applicant reupload gas': 0,
            'relay hash gas': 0,
            'relay num gas': 0,
            'relay reupload gas': 0
        };

        // 计算所有数据的平均值
        for (let i = 0; i < currentDataset.source.length; i++) {
            let item = currentDataset.source[i];
            stage2Values['applicant hash gas'] += Number(item[1] || 0);
            stage2Values['applicant num gas'] += Number(item[2] || 0);
            stage2Values['applicant reupload gas'] += Number(item[3] || 0);
            stage2Values['relay hash gas'] += Number(item[4] || 0);
            stage2Values['relay num gas'] += Number(item[5] || 0);
            stage2Values['relay reupload gas'] += Number(item[6] || 0);
        }

        // 计算平均值
        const count = Math.max(1, currentDataset.source.length);
        Object.keys(stage2Values).forEach((key) => {
            stage2Values[key] = Math.round(stage2Values[key] / count);
        });

        // 添加Stage 2的值
        newRow.push(
            stage2Values['applicant hash gas'],
            stage2Values['applicant num gas'],
            stage2Values['applicant reupload gas'],
            stage2Values['relay hash gas'],
            stage2Values['relay num gas'],
            stage2Values['relay reupload gas']
        );

        // Stage 3: 添加空值（代码优化后，暂时为空）
        newRow.push(0, 0, 0, 0, 0, 0);

        newSource.push(newRow);
        option.value.dataset.source = newSource;
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
