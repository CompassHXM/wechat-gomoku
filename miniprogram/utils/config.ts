// config.ts - 配置文件

// 后端配置组
export const BACKEND_CONFIGS = {
  // Node.js 后端（原版）
  nodejs: {
    API_BASE_URL: 'https://gomoku-app-service-dbdzaug6ejh7e5dx.eastasia-01.azurewebsites.net',
    PUBSUB_URL: 'wss://gomoku-pubsub.webpubsub.azure.com/client/hubs/gomoku',
    description: 'Node.js + TypeScript 后端'
  },
  // Go 后端（新版）
  go: {
    API_BASE_URL: 'https://gomoku-api-go.azurewebsites.net',
    PUBSUB_URL: 'wss://gomoku-pubsub.webpubsub.azure.com/client/hubs/gomoku',
    description: 'Go 后端 - 性能优化版'
  }
};

// 当前使用的后端配置（切换这里来选择不同的后端）
const CURRENT_BACKEND: keyof typeof BACKEND_CONFIGS = 'go'; // 可选: 'nodejs' 或 'go'

// 导出当前配置
export const API_BASE_URL = BACKEND_CONFIGS[CURRENT_BACKEND].API_BASE_URL;
export const PUBSUB_URL = BACKEND_CONFIGS[CURRENT_BACKEND].PUBSUB_URL;

export const config = {
  API_BASE_URL,
  PUBSUB_URL,
  currentBackend: CURRENT_BACKEND,
  description: BACKEND_CONFIGS[CURRENT_BACKEND].description
};
