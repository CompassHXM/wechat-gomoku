"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.DEV_CONFIG = exports.PUBSUB_URL = exports.API_BASE_URL = void 0;
// config.ts - 配置文件
exports.API_BASE_URL = 'https://your-app.azurewebsites.net'; // 替换为你的Azure应用URL
exports.PUBSUB_URL = 'wss://your-pubsub.webpubsub.azure.com/client/hubs/wuziqi'; // 替换为你的PubSub URL
// 开发环境配置
exports.DEV_CONFIG = {
    API_BASE_URL: 'http://localhost:3000',
    PUBSUB_URL: 'ws://localhost:8080/client/hubs/wuziqi'
};
// 根据环境选择配置
const isDev = false; // 开发时设置为true
exports.config = isDev ? exports.DEV_CONFIG : {
    API_BASE_URL: exports.API_BASE_URL,
    PUBSUB_URL: exports.PUBSUB_URL
};
