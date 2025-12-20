"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.PUBSUB_URL = exports.API_BASE_URL = void 0;
// config.ts - 配置文件
exports.API_BASE_URL = 'https://gomoku-app-service-dbdzaug6ejh7e5dx.eastasia-01.azurewebsites.net'; // 替换为你的Azure应用URL
exports.PUBSUB_URL = 'wss://gomoku-pubsub.webpubsub.azure.com/client/hubs/gomoku'; // 替换为你的PubSub URL
exports.config = {
    API_BASE_URL: exports.API_BASE_URL,
    PUBSUB_URL: exports.PUBSUB_URL
};
