// database.ts - Azure Cosmos DB配置
import { CosmosClient, Database, Container } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.COSMOS_ENDPOINT!;
const key = process.env.COSMOS_KEY!;
const databaseId = process.env.COSMOS_DATABASE || 'wuziqi';
const containerId = process.env.COSMOS_CONTAINER || 'game_rooms';

// 创建Cosmos DB客户端
const client = new CosmosClient({ endpoint, key });

let database: Database;
let container: Container;

// 初始化数据库
export async function initDatabase() {
  try {
    // 创建数据库（如果不存在）
    const { database: db } = await client.databases.createIfNotExists({
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
