// pubsub.ts - Azure Web PubSub配置（实时通信）
import { WebPubSubServiceClient } from '@azure/web-pubsub';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.PUBSUB_CONNECTION_STRING!;
const hubName = process.env.PUBSUB_HUB_NAME || 'gomoku';

// 创建PubSub客户端
const serviceClient = new WebPubSubServiceClient(connectionString, hubName);

// 获取客户端访问令牌
export async function getClientAccessToken(userId: string, roomId?: string) {
  try {
    const token = await serviceClient.getClientAccessToken({
      userId,
      roles: ['webpubsub.sendToGroup', 'webpubsub.joinLeaveGroup'],
      groups: roomId ? [roomId] : undefined
    });
    return token;
  } catch (error) {
    console.error('Failed to get client access token:', error);
    throw error;
  }
}

// 向房间发送消息
export async function sendToRoom(roomId: string, message: any) {
  try {
    // 发送 JSON 对象时，不需要指定 contentType，SDK 会自动处理
    await serviceClient.group(roomId).sendToAll(message);
  } catch (error) {
    console.error('Failed to send message to room:', error);
    throw error;
  }
}

// 将用户添加到房间组
export async function addUserToRoom(userId: string, roomId: string) {
  try {
    await serviceClient.group(roomId).addUser(userId);
  } catch (error) {
    console.error('Failed to add user to room:', error);
    throw error;
  }
}

// 从房间组移除用户
export async function removeUserFromRoom(userId: string, roomId: string) {
  try {
    await serviceClient.group(roomId).removeUser(userId);
  } catch (error) {
    console.error('Failed to remove user from room:', error);
  }
}

export { serviceClient };
