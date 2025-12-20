// routes.ts - API路由
import { Router } from 'express';
import * as roomService from '../services/roomService';
import { getClientAccessToken, addUserToRoom } from '../config/pubsub';

const router = Router();

// 获取PubSub连接令牌
router.post('/api/auth/token', async (req, res) => {
  try {
    const { userId, roomId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const token = await getClientAccessToken(userId, roomId);
    res.json(token);
  } catch (error: any) {
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
  } catch (error: any) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取房间列表
router.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await roomService.getRooms();
    res.json(rooms);
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    console.error('Error making move:', error);
    res.status(500).json({ error: error.message });
  }
});

// 离开房间
router.post('/api/rooms/leave', async (req, res) => {
  try {
    const { userId, roomId } = req.body;
    
    if (!userId || !roomId) {
      return res.status(400).json({ error: 'userId and roomId are required' });
    }

    await roomService.leaveRoom({ userId, roomId });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: error.message });
  }
});

// Web PubSub 事件处理 (用于处理断线)
router.post('/api/webpubsub/event', async (req, res) => {
  // 处理 CloudEvents 握手验证
  if (req.headers['webhook-request-origin']) {
    res.setHeader('Webhook-Allowed-Origin', '*');
    res.status(200).send();
    return;
  }

  const eventType = req.headers['ce-type'];
  const userId = req.headers['ce-userid'] as string;
  const eventName = req.headers['ce-eventname'];
  const connectionId = req.headers['ce-connectionid'];

  console.log(`[WebPubSub] Event: ${eventType}, User: ${userId}, Connection: ${connectionId}`);

  if (eventType === 'azure.webpubsub.sys.connect') {
    // 允许连接
    res.status(200).send();
    return;
  }
  
  if (eventType === 'azure.webpubsub.sys.disconnected') {
    console.log(`User disconnected: ${userId}`);
    if (userId) {
      // 查找用户所在的房间并移除
      const room = await roomService.findRoomByUserId(userId);
      if (room) {
        await roomService.leaveRoom({ userId, roomId: room.id! });
      }
    }
  } else if (eventType === 'azure.webpubsub.user.message') {
    // 处理用户消息
    try {
      const message = req.body;
      console.log(`Received message from ${userId}:`, message);
      
      if (message.type === 'joinGroup' && message.group) {
        await addUserToRoom(userId, message.group);
        console.log(`Added user ${userId} to group ${message.group} via message`);
      }
    } catch (err) {
      console.error('Error handling user message:', err);
    }
  }

  res.status(200).send();
});

// 健康检查
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
