"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// routes.ts - API路由
const express_1 = require("express");
const roomService = __importStar(require("../services/roomService"));
const pubsub_1 = require("../config/pubsub");
const router = (0, express_1.Router)();
// 获取PubSub连接令牌
router.post('/api/auth/token', async (req, res) => {
    try {
        const { userId, roomId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const token = await (0, pubsub_1.getClientAccessToken)(userId, roomId);
        res.json(token);
    }
    catch (error) {
        console.error('Error getting token:', error);
        res.status(500).json({ error: error.message });
    }
});
// 创建房间
router.post('/api/rooms/create', async (req, res) => {
    try {
        const { userId, nickname } = req.body;
        if (!userId || !nickname) {
            return res.status(400).json({ error: 'userId and nickname are required' });
        }
        const room = await roomService.createRoom({ userId, nickname });
        res.json(room);
    }
    catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: error.message });
    }
});
// 获取房间列表
router.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await roomService.getRooms();
        res.json(rooms);
    }
    catch (error) {
        console.error('Error getting rooms:', error);
        res.status(500).json({ error: error.message });
    }
});
// 获取单个房间
router.get('/api/rooms/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await roomService.getRoom(roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json(room);
    }
    catch (error) {
        console.error('Error getting room:', error);
        res.status(500).json({ error: error.message });
    }
});
// 加入房间
router.post('/api/rooms/join', async (req, res) => {
    try {
        const { userId, nickname, roomId } = req.body;
        if (!userId || !nickname || !roomId) {
            return res.status(400).json({ error: 'userId, nickname, and roomId are required' });
        }
        const room = await roomService.joinRoom({ userId, nickname, roomId });
        res.json(room);
    }
    catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({ error: error.message });
    }
});
// 下棋
router.post('/api/rooms/move', async (req, res) => {
    try {
        const { userId, roomId, row, col } = req.body;
        if (!userId || !roomId || row === undefined || col === undefined) {
            return res.status(400).json({ error: 'userId, roomId, row, and col are required' });
        }
        const room = await roomService.makeMove({ userId, roomId, row, col });
        res.json(room);
    }
    catch (error) {
        console.error('Error making move:', error);
        res.status(500).json({ error: error.message });
    }
});
// 健康检查
router.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
exports.default = router;
