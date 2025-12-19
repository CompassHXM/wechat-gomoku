"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceClient = void 0;
exports.getClientAccessToken = getClientAccessToken;
exports.sendToRoom = sendToRoom;
exports.addUserToRoom = addUserToRoom;
exports.removeUserFromRoom = removeUserFromRoom;
// pubsub.ts - Azure Web PubSub配置（实时通信）
const web_pubsub_1 = require("@azure/web-pubsub");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connectionString = process.env.PUBSUB_CONNECTION_STRING;
const hubName = process.env.PUBSUB_HUB_NAME || 'wuziqi';
// 创建PubSub客户端
const serviceClient = new web_pubsub_1.WebPubSubServiceClient(connectionString, hubName);
exports.serviceClient = serviceClient;
// 获取客户端访问令牌
async function getClientAccessToken(userId, roomId) {
    try {
        const token = await serviceClient.getClientAccessToken({
            userId,
            roles: ['webpubsub.sendToGroup', 'webpubsub.joinLeaveGroup'],
            groups: roomId ? [roomId] : undefined
        });
        return token;
    }
    catch (error) {
        console.error('Failed to get client access token:', error);
        throw error;
    }
}
// 向房间发送消息
async function sendToRoom(roomId, message) {
    try {
        await serviceClient.sendToGroup(roomId, message, {
            contentType: 'application/json'
        });
    }
    catch (error) {
        console.error('Failed to send message to room:', error);
        throw error;
    }
}
// 将用户添加到房间组
async function addUserToRoom(userId, roomId) {
    try {
        await serviceClient.addUserToGroup(roomId, userId);
    }
    catch (error) {
        console.error('Failed to add user to room:', error);
        throw error;
    }
}
// 从房间组移除用户
async function removeUserFromRoom(userId, roomId) {
    try {
        await serviceClient.removeUserFromGroup(roomId, userId);
    }
    catch (error) {
        console.error('Failed to remove user from room:', error);
    }
}
