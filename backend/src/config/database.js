"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getContainer = getContainer;
exports.getDatabase = getDatabase;
// database.ts - Azure Cosmos DB配置
const cosmos_1 = require("@azure/cosmos");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE || 'wuziqi';
const containerId = process.env.COSMOS_CONTAINER || 'game_rooms';
// 创建Cosmos DB客户端
const client = new cosmos_1.CosmosClient({ endpoint, key });
let database;
let container;
// 初始化数据库
async function initDatabase() {
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
    }
    catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}
// 获取容器实例
function getContainer() {
    if (!container) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return container;
}
// 获取数据库实例
function getDatabase() {
    if (!database) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return database;
}
