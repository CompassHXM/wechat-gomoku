# 五子棋小程序系统设计文档

## 1. 系统架构概览

本项目采用典型的客户端-服务器架构，结合云服务实现实时对战功能。

### 核心组件
- **客户端 (Frontend)**: 微信小程序 (WeChat Mini Program)
  - 负责界面展示、用户交互、WebSocket 连接维护。
- **服务端 (Backend)**: Node.js + Express + TypeScript
  - 负责业务逻辑、房间管理、游戏规则判定。
- **实时通信 (Real-time)**: Azure Web PubSub
  - 负责管理 WebSocket 长连接，实现服务端向客户端的实时消息推送。
- **数据库 (Database)**: (目前代码中使用内存存储或简单的持久化，可扩展为 MongoDB/CosmosDB)
- **云函数 (Cloud Functions)**: 微信云开发
  - 负责用户登录鉴权 (OpenID 获取)。

## 2. 技术栈

- **前端**: WXML, WXSS, TypeScript, 微信小程序 API
- **后端**: Node.js, Express, TypeScript
- **通信协议**: HTTP (REST API), WebSocket (via Azure Web PubSub)
- **部署**: Docker 容器化部署

## 3. 数据流设计

### 3.1 用户登录
1. 小程序端调用 `wx.login` 获取 code。
2. 调用云函数 `login` 获取用户 OpenID。
3. 用户信息存储在本地，作为后续请求的身份标识 (`userId`)。

### 3.2 建立连接
1. 用户进入游戏大厅或房间。
2. 调用后端 `POST /api/auth/token` 获取 Web PubSub 连接令牌。
3. 小程序建立 WebSocket 连接。
4. 连接成功后，发送 `joinGroup` 消息订阅特定房间的更新。

### 3.3 游戏流程
1. **创建/加入房间**: 用户通过 HTTP API 请求后端。
2. **状态同步**: 后端更新内存中的房间状态，并通过 Web PubSub 向房间内的所有客户端广播最新的 `GameRoom` 数据。
3. **落子**:
   - 玩家点击棋盘 -> 调用 `POST /api/rooms/move`。
   - 后端验证合法性 -> 更新棋盘 -> 判断胜负。
   - 后端广播更新后的房间状态。
4. **游戏结束**: 后端判断五子连珠，更新状态为 `finished` 并广播结果。

## 4. 核心模块设计

### 4.1 房间服务 (RoomService)
- **数据结构**: 使用 Map 或数据库存储房间状态。
- **并发控制**: 确保同一时间只有一个落子请求被处理（Node.js 单线程特性天然支持简单的并发控制，但在分布式下需加锁）。
- **生命周期**:
  - 创建: 分配房间号，初始化棋盘。
  - 销毁: 所有玩家离开后自动回收资源。

### 4.2 消息推送机制
- 后端不直接持有 WebSocket 连接，而是通过 Azure Web PubSub 服务代理。
- 后端使用 Azure SDK 向特定 `Hub` 和 `Group` (RoomId) 发送消息。
- 客户端接收消息后，根据消息内容更新 UI (如重绘棋盘)。

### 4.3 掉线处理
- **Web PubSub 事件**: 监听 `sys.disconnected` 事件。
- **逻辑**: 当玩家断开连接时，后端自动将其移出房间或标记为离线。如果房间空置，则清理房间。

## 5. 目录结构说明

```
root/
├── backend/                # 后端服务
│   ├── src/
│   │   ├── config/         # 数据库与 PubSub 配置
│   │   ├── routes/         # API 路由定义
│   │   ├── services/       # 业务逻辑 (RoomService)
│   │   └── types/          # TypeScript 类型定义
├── miniprogram/            # 微信小程序前端
│   ├── pages/              # 页面 (game, lobby, index)
│   └── utils/              # 工具类 (api, websocket)
└── cloudfunctions/         # 微信云函数
```

## 6. 未来扩展规划
- **持久化存储**: 接入 MongoDB 或 Cosmos DB 保存对战历史。
- **排行榜**: 基于用户胜率统计。
- **AI 对战**: 集成 AI 算法实现人机对战。
- **观战模式**: 完善 Spectator 角色的数据同步。
