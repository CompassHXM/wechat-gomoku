// api.ts - API请求工具
import { config } from './config';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: any;
}

// 通用请求方法
export function request<T>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          reject(new Error((res.data as any).error || 'Request failed'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

// API方法
export const api = {
  // 获取PubSub连接令牌
  getToken(userId: string, roomId?: string) {
    return request<{ url: string; token: string }>({
      url: '/api/auth/token',
      method: 'POST',
      data: { userId, roomId }
    });
  },

  // 创建房间
  createRoom(userId: string, nickname: string) {
    return request<any>({
      url: '/api/rooms/create',
      method: 'POST',
      data: { userId, nickname }
    });
  },

  // 获取房间列表
  getRooms() {
    return request<any[]>({
      url: '/api/rooms',
      method: 'GET'
    });
  },

  // 获取单个房间
  getRoom(roomId: string) {
    return request<any>({
      url: `/api/rooms/${roomId}`,
      method: 'GET'
    });
  },

  // 加入房间
  joinRoom(userId: string, nickname: string, roomId: string) {
    return request<any>({
      url: '/api/rooms/join',
      method: 'POST',
      data: { userId, nickname, roomId }
    });
  },

  // 下棋
  makeMove(userId: string, roomId: string, row: number, col: number) {
    return request<any>({
      url: '/api/rooms/move',
      method: 'POST',
      data: { userId, roomId, row, col }
    });
  },

  // 健康检查
  healthCheck() {
    return request<{ status: string; timestamp: string }>({
      url: '/api/health',
      method: 'GET'
    });
  }
};
