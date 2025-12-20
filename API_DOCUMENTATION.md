# 微信小程序五子棋后端 API 文档

本文档描述了五子棋游戏后端的 RESTful API 接口。

## 基本信息

- **Base URL**: `http://<host>:<port>` (本地开发通常为 `http://localhost:3000`)
- **数据格式**: JSON
- **字符编码**: UTF-8

## 认证与实时通信

### 1. 获取 Web PubSub 连接令牌
用于前端建立 WebSocket 连接。

- **接口**: `POST /api/auth/token`
- **描述**: 获取 Azure Web PubSub 的连接 URL 和 Access Token。
- **请求体**:
  ```json
  {
    "userId": "string", // 用户唯一标识
    "roomId": "string"  // (可选) 房间ID，用于初始分组
  }
  ```
- **响应**:
  ```json
  {
    "url": "wss://<service-name>.webpubsub.azure.com/client/...",
    "token": "string"
  }
  ```

## 房间管理

### 2. 创建房间
创建一个新的游戏房间。

- **接口**: `POST /api/rooms/create`
- **请求体**:
  ```json
  {
    "userId": "string",   // 创建者ID
    "nickname": "string"  // 创建者昵称
  }
  ```
- **响应**:
  ```json
  {
    "id": "string",       // 房间ID
    "roomNumber": 1001,   // 房间号（用于展示）
    "creator": {
      "userId": "string",
      "nickname": "string"
    },
    "players": [...],     // 包含创建者
    "status": "waiting",
    ... // 其他房间信息
  }
  ```

### 3. 获取房间列表
获取当前所有活跃的房间。

- **接口**: `GET /api/rooms`
- **响应**: `GameRoom[]` (房间对象数组)

### 4. 获取房间详情
获取指定房间的详细信息。

- **接口**: `GET /api/rooms/:roomId`
- **参数**:
  - `roomId`: 路径参数，房间ID
- **响应**: `GameRoom` 对象
- **错误**: 404 Room not found

### 5. 加入房间
加入一个已存在的房间。

- **接口**: `POST /api/rooms/join`
- **请求体**:
  ```json
  {
    "userId": "string",
    "nickname": "string",
    "roomId": "string"
  }
  ```
- **响应**: `GameRoom` 对象 (更新后的房间状态)

### 6. 离开房间
退出当前房间。

- **接口**: `POST /api/rooms/leave`
- **请求体**:
  ```json
  {
    "userId": "string",
    "roomId": "string"
  }
  ```
- **响应**:
  ```json
  {
    "success": true
  }
  ```

## 游戏逻辑

### 7. 落子 (Move)
玩家在棋盘上进行落子操作。

- **接口**: `POST /api/rooms/move`
- **请求体**:
  ```json
  {
    "userId": "string",
    "roomId": "string",
    "row": number,      // 行坐标 (0-14)
    "col": number       // 列坐标 (0-14)
  }
  ```
- **响应**: `GameRoom` 对象 (包含更新后的棋盘和游戏状态)

## 系统接口

### 8. 健康检查
检查服务是否运行正常。

- **接口**: `GET /api/health`
- **响应**:
  ```json
  {
    "status": "ok",
    "timestamp": "2023-12-20T..."
  }
  ```

### 9. Web PubSub 事件回调 (Webhook)
处理来自 Azure Web PubSub 服务的事件（如连接、断开、消息）。

- **接口**: `POST /api/webpubsub/event`
- **用途**: 内部使用，由 Azure 服务调用。
- **处理事件**:
  - `sys.connect`: 客户端尝试连接
  - `sys.disconnected`: 客户端断开连接 (自动处理玩家离线/退出)
  - `user.message`: 处理自定义消息 (如 `joinGroup`)

## 数据模型 (Types)

### GameRoom
```typescript
interface GameRoom {
  id?: string;
  roomNumber: number;
  creator: {
    userId: string;
    nickname: string;
  };
  players: Player[];
  spectators: Spectator[];
  board: number[][];      // 15x15 二维数组，0:空, 1:黑, 2:白
  currentPlayer: number;  // 当前执子方 (1或2)
  status: 'waiting' | 'playing' | 'finished';
  moveHistory: Move[];
  winner: string | null;  // 获胜者 userId
  createTime: Date;
  updateTime: Date;
}
```

### Player
```typescript
interface Player {
  userId: string;
  nickname: string;
  color: number; // 1: 黑子, 2: 白子
  isReady: boolean;
}
```
