// index.ts - 主入口文件
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/database';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 特殊处理 Azure Web PubSub 的握手请求 (必须在 CORS 中间件之前)
app.options('/api/webpubsub/event', (req, res) => {
  if (req.headers['webhook-request-origin']) {
    res.setHeader('Webhook-Allowed-Origin', '*');
    res.status(200).send();
  } else {
    res.status(200).send();
  }
});

// 中间件
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
// 支持解析 CloudEvents 内容类型
app.use(express.json({ 
  type: ['application/json', 'application/cloudevents+json'] 
}));
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 健康检查根路由
app.get('/', (req, res) => {
  res.send('Gomoku Backend is running!');
});

// 路由
console.log('Mounting routes...');
app.use(routes);

// 404 处理 (放在所有路由之后)
app.use('*', (req, res) => {
  console.log(`404 Not Found: ${req.originalUrl}`);
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 启动服务器
async function start() {
  try {
    // 初始化数据库
    await initDatabase();
    console.log('Database initialized successfully');

    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API endpoint: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
