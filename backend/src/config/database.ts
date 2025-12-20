// database.ts - Azure Cosmos DB配置
import { CosmosClient, Database, Container } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

const databaseId = process.env.COSMOS_DATABASE || 'gomoku';
const containerId = process.env.COSMOS_CONTAINER || 'game_rooms';

let client: CosmosClient;
let database: Database;
let container: Container;

function getClient(): CosmosClient {
  if (!client) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;

    // 调试日志：检查环境变量是否正确加载
    console.log('--- Cosmos DB Configuration ---');
    console.log('Endpoint:', endpoint);
    console.log('Key exists:', !!key);
    console.log('Key length:', key ? key.length : 0);
    console.log('Database ID:', databaseId);
    console.log('-------------------------------');

    if (!endpoint || !key) {
      const errorMsg = 'CRITICAL: COSMOS_ENDPOINT or COSMOS_KEY is missing in environment variables!';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    client = new CosmosClient({ 
      endpoint, 
      key,
      connectionPolicy: {
        enableEndpointDiscovery: true
      }
    });
  }
  return client;
}

// 初始化数据库
export async function initDatabase() {
  try {
    const cosmosClient = getClient();

    // 创建数据库（如果不存在）
    const { database: db } = await cosmosClient.databases.createIfNotExists({
      id: databaseId
    });
    database = db;
    console.log(`Database ${databaseId} ready`);

    // 创建容器（如果不存在）
    const { container: cont } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: ['/status'] }
    });
    container = cont;
    console.log(`Container ${containerId} ready`);
    

    return { database, container };
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// 获取容器实例
export function getContainer(): Container {
  if (!container) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return container;
}

// 获取数据库实例
export function getDatabase(): Database {
  if (!database) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return database;
}
