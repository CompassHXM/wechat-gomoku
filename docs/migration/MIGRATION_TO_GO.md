# 后端迁移到 Go 语言完成

## 迁移概览

已成功将微信五子棋游戏后端从 TypeScript/Node.js 迁移到 Go 语言。新的后端位于 `backend-go/` 目录。

## 文件结构对比

### TypeScript 版本 (backend/)
```
backend/
├── src/
│   ├── index.ts         → main.go
│   ├── config/
│   │   ├── database.ts  → config/database.go
│   │   └── pubsub.ts    → config/pubsub.go
│   ├── routes/
│   │   └── index.ts     → routes/routes.go
│   ├── services/
│   │   └── roomService.ts → services/room.go + game.go + cleanup.go
│   └── types/
│       └── index.ts     → types/types.go
├── package.json         → go.mod
└── Dockerfile           → Dockerfile
```

### Go 版本 (backend-go/)
```
backend-go/
├── main.go              # 主入口
├── go.mod               # 依赖管理
├── go.sum               # 依赖锁定
├── Dockerfile           # Docker 配置
├── Procfile             # 部署配置
├── .env.example         # 环境变量示例
├── .gitignore           # Git 忽略文件
├── README.md            # 项目文档
├── test-backend.ps1     # 测试脚本
├── config/              # 配置模块
│   ├── database.go      # Cosmos DB 配置
│   └── pubsub.go        # Web PubSub 配置
├── types/               # 数据类型定义
│   └── types.go
├── services/            # 业务逻辑
│   ├── room.go          # 房间管理
│   ├── game.go          # 游戏逻辑（下棋、判定）
│   └── cleanup.go       # 清理任务（离开房间、定时清理）
└── routes/              # 路由处理
    └── routes.go
```

## 主要技术栈变更

| 功能 | TypeScript 版本 | Go 版本 |
|------|-----------------|---------|
| 语言 | TypeScript | Go 1.21+ |
| Web 框架 | Express | Gin |
| Cosmos DB SDK | @azure/cosmos | azcosmos |
| Web PubSub SDK | @azure/web-pubsub | HTTP REST API |
| 环境变量 | dotenv | godotenv |
| UUID 生成 | uuid | google/uuid |
| CORS | cors | gin-contrib/cors |

## API 端点（保持一致）

所有 API 端点保持与原 TypeScript 版本完全一致：

- `POST /api/auth/token` - 获取 PubSub 访问令牌
- `POST /api/rooms/create` - 创建房间
- `GET /api/rooms` - 获取房间列表
- `GET /api/rooms/:roomId` - 获取房间详情
- `POST /api/rooms/join` - 加入房间
- `POST /api/rooms/move` - 下棋
- `POST /api/rooms/leave` - 离开房间
- `GET /api/health` - 健康检查
- `POST /api/webpubsub/event` - Web PubSub 事件处理

## 功能特性

✅ 所有原有功能已实现：
- 房间创建和管理
- 玩家加入/离开
- 实时对战
- 旁观者功能
- 游戏状态同步
- 自动清理不活跃房间（10分钟）
- Web PubSub 实时通信
- 断线处理

## 性能优势

Go 版本相比 Node.js 版本的优势：

1. **启动速度**: 更快的应用启动时间
2. **内存占用**: 显著降低的内存使用
3. **并发性能**: 原生 goroutines 支持，更好的并发处理
4. **部署简单**: 编译为单一二进制文件，无需 node_modules
5. **类型安全**: 编译时类型检查，减少运行时错误

## 环境变量配置

创建 `.env` 文件（与 TypeScript 版本相同）：

```env
# Cosmos DB
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE=gomoku
COSMOS_CONTAINER=game_rooms

# Azure Web PubSub
PUBSUB_CONNECTION_STRING=Endpoint=https://your-pubsub.webpubsub.azure.com;AccessKey=your-key;Version=1.0;
PUBSUB_HUB_NAME=gomoku

# 服务器
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

## 快速开始

### 1. 安装 Go
确保安装 Go 1.21 或更高版本：
```bash
go version
```

### 2. 进入 Go 后端目录
```bash
cd backend-go
```

### 3. 配置环境变量
复制 `.env.example` 为 `.env` 并填写配置：
```bash
cp .env.example .env
```

### 4. 安装依赖
```bash
go mod download
```

### 5. 运行服务
```bash
go run main.go
```

服务将在 `http://localhost:3000` 启动。

### 6. 测试 API
运行测试脚本：
```bash
.\test-backend.ps1
```

## Docker 部署

### 构建镜像
```bash
docker build -t gomoku-backend-go ./backend-go
```

### 运行容器
```bash
docker run -p 3000:3000 --env-file ./backend-go/.env gomoku-backend-go
```

## Azure 部署

Go 版本可以直接部署到 Azure App Service：

```powershell
# 1. 创建 App Service (如果还没有)
New-AzAppServicePlan `
  -Name gomoku-plan-go `
  -ResourceGroupName <resource-group> `
  -Location eastasia `
  -Linux `
  -Tier Free

New-AzWebApp `
  -ResourceGroupName <resource-group> `
  -Name <app-name> `
  -Location eastasia `
  -AppServicePlan gomoku-plan-go

Set-AzWebApp `
  -ResourceGroupName <resource-group> `
  -Name <app-name> `
  -LinuxFxVersion "GO|1.21"

# 2. 构建二进制文件
cd backend-go
$env:GOOS="linux"
$env:GOARCH="amd64"
go build -o main .

# 3. 创建部署包并上传到 Azure
Compress-Archive -Path main -DestinationPath deploy.zip -Force

Publish-AzWebApp `
  -ResourceGroupName <resource-group> `
  -Name <app-name> `
  -ArchivePath .\deploy.zip `
  -Force

# 4. 配置环境变量
$settings = @{
    COSMOS_ENDPOINT="https://your-account.documents.azure.com:443/"
    COSMOS_KEY="your-cosmos-key"
    COSMOS_DATABASE="gomoku"
    COSMOS_CONTAINER="game_rooms"
    PUBSUB_CONNECTION_STRING="your-pubsub-connection-string"
    PUBSUB_HUB_NAME="gomoku"
    PORT="8080"
    NODE_ENV="production"
}

Set-AzWebApp `
  -ResourceGroupName <resource-group> `
  -Name <app-name> `
  -AppSettings $settings
```

## 迁移注意事项

1. **Web PubSub SDK**: Go 版本使用 HTTP REST API 而非官方 SDK（因为 SDK 版本问题），功能完全等效
2. **JSON 序列化**: 使用结构体标签定义 JSON 字段映射
3. **错误处理**: Go 使用显式错误返回，更易于调试
4. **Cosmos DB**: 分区键处理逻辑与 TypeScript 版本一致（使用 `status` 作为分区键）
5. **定时任务**: 使用 goroutine 和 ticker 实现定期清理

## 测试兼容性

Go 版本与 TypeScript 版本完全兼容：
- 前端代码无需修改
- API 响应格式完全一致
- 数据库结构保持不变
- 实时通信协议兼容

## 迁移清单

- [x] 创建 Go 项目结构
- [x] 实现 Cosmos DB 连接
- [x] 实现 Web PubSub 集成
- [x] 实现所有 API 端点
- [x] 实现房间管理逻辑
- [x] 实现游戏逻辑（下棋、判定）
- [x] 实现清理任务
- [x] 实现 Web PubSub 事件处理
- [x] 创建 Docker 配置
- [x] 创建部署配置
- [x] 编写文档

## 后续建议

1. **负载测试**: 对比 Go 和 Node.js 版本的性能表现
2. **监控**: 添加 Prometheus/Grafana 监控
3. **日志**: 集成结构化日志库（如 zap 或 logrus）
4. **单元测试**: 添加完整的单元测试覆盖
5. **CI/CD**: 配置自动化部署流水线

## 支持

如有问题，请参考：
- [backend-go/README.md](../backend-go/README.md) - 详细的 Go 版本文档
- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) - API 接口文档
- [DESIGN_DOCUMENT.md](../DESIGN_DOCUMENT.md) - 设计文档

---

迁移完成日期: 2025年12月22日
