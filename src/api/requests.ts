import axios from 'axios';

// 自定义axios请求

//1、对axios二次封装
const requests = axios.create({
    //基础路径，requests发出的请求在端口号后面会跟改baseURl
    baseURL: 'http://localhost:3000',
    timeout: 5000
});

//2、配置请求拦截器
requests.interceptors.request.use((config) => {
    //config内主要是对请求头Header配置
    //比如添加token

    return config;
});

//3、配置相应拦截器: 成功了返回data; 失败了返回promise. 在调用时不用做try catch错误处理
requests.interceptors.response.use(
    (res) => {
        return res.data;
    },
    (error) => {
        console.log('响应失败' + error);
        return Promise.reject(new Error('fail'));
    }
);

//4、对外暴露
export default requests;
