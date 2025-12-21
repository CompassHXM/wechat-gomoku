"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
exports.request = request;
// api.ts - API请求工具
const config_1 = require("./config");
// 通用请求方法
function request(options) {
    return new Promise((resolve, reject) => {
        wx.request({
            url: `${config_1.config.API_BASE_URL}${options.url}`,
            method: options.method || 'GET',
            data: options.data,
            header: {
                'Content-Type': 'application/json',
                ...options.header
            },
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                }
                else {
                    reject(new Error(res.data.error || 'Request failed'));
                }
            },
            fail: (err) => {
                reject(err);
            }
        });
    });
}
// API方法
exports.api = {
    // 获取PubSub连接令牌
    getToken(userId, roomId) {
        return request({
            url: '/api/auth/token',
            method: 'POST',
            data: { userId, roomId }
        });
    },
    // 创建房间
    createRoom(userId, nickname) {
        return request({
            url: '/api/rooms/create',
            method: 'POST',
            data: { userId, nickname }
        });
    },
    // 获取房间列表
    getRooms() {
        return request({
            url: '/api/rooms',
            method: 'GET'
        });
    },
    // 获取单个房间
    getRoom(roomId) {
        return request({
            url: `/api/rooms/${roomId}`,
            method: 'GET'
        });
    },
    // 加入房间
    joinRoom(userId, nickname, roomId) {
        return request({
            url: '/api/rooms/join',
            method: 'POST',
            data: { userId, nickname, roomId }
        });
    },
    // 下棋
    makeMove(userId, roomId, row, col) {
        return request({
            url: '/api/rooms/move',
            method: 'POST',
            data: { userId, roomId, row, col }
        });
    },
    // 离开房间
    leaveRoom(userId, roomId) {
        return request({
            url: '/api/rooms/leave',
            method: 'POST',
            data: { userId, roomId }
        });
    },
    // 健康检查
    healthCheck() {
        return request({
            url: '/api/health',
            method: 'GET'
        });
    }
};
