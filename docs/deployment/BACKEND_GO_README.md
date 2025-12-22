# 五子棋游戏后端 - Go 版本

这是五子棋游戏后端的 Go 语言实现，使用 Azure Cosmos DB 和 Azure Web PubSub。

## 技术栈

- **语言**: Go 1.21+
- **Web框架**: Gin
- **数据库**: Azure Cosmos DB
- **实时通信**: Azure Web PubSub
- **部署**: Docker / Azure App Service

## 项目结构

```
backend-go/
├── main.go              # 主入口文件
├── go.mod              # Go 模块依赖
├── go.sum              # 依赖版本锁定
├── Dockerfile          # Docker 配置
├── Procfile            # Heroku/Azure 部署配置
├── .env.example        # 环境变量示例
├── config/             # 配置模块
│   ├── database.go     # Cosmos DB 配置
│   └── pubsub.go       # Web PubSub 配置
├── types/              # 数据类型定义
│   └── types.go
├── services/           # 业务逻辑
│   ├── room.go         # 房间管理
│   ├── game.go         # 游戏逻辑
│   └── cleanup.go      # 清理任务
└── routes/             # 路由处理
    └── routes.go
```

## 功能特性

- ✅ 房间创建和管理
- ✅ 玩家加入/离开
- ✅ 实时对战
- ✅ 旁观者功能
- ✅ 游戏状态同步
- ✅ 自动清理不活跃房间
- ✅ Web PubSub 实时通信

## API 端点

### 认证相关
- `POST /api/auth/token` - 获取 PubSub 访问令牌

### 房间相关
- `POST /api/rooms/create` - 创建房间
- `GET /api/rooms` - 获取房间列表
- `GET /api/rooms/:roomId` - 获取房间详情
- `POST /api/rooms/join` - 加入房间
- `POST /api/rooms/move` - 下棋
- `POST /api/rooms/leave` - 离开房间

### 系统相关
- `GET /api/health` - 健康检查
- `POST /api/webpubsub/event` - Web PubSub 事件处理

## 环境变量

创建 `.env` 文件并配置以下环境变量：

```env
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE=gomoku
COSMOS_CONTAINER=game_rooms

PUBSUB_CONNECTION_STRING=Endpoint=https://your-pubsub.webpubsub.azure.com;AccessKey=your-key;Version=1.0;
PUBSUB_HUB_NAME=gomoku

PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

## 本地开发

### 前置要求
- Go 1.21 或更高版本
- Azure Cosmos DB 账户
- Azure Web PubSub 服务

### 安装依赖

```bash
go mod download
```

### 运行服务

```bash
go run main.go
```

服务将在 `http://localhost:3000` 启动。

### 构建

```bash
go build -o gomoku-backend
```

## Docker 部署

### 构建镜像

```bash
docker build -t gomoku-backend-go .
```

### 运行容器

```bash
docker run -p 3000:3000 --env-file .env gomoku-backend-go
```

## Azure 部署

### 使用 Azure App Service

1. 创建 App Service Plan 和 Web App
```powershell
# 创建 App Service Plan
New-AzAppServicePlan `
  -Name <app-service-plan> `
  -ResourceGroupName <resource-group> `
  -Location eastasia `
  -Linux `
  -Tier Free

# 创建 Web App
New-AzWebApp `
  -ResourceGroupName <resource-group> `
  -Name <app-name> `
  -Location eastasia `
  -AppServicePlan <app-service-plan>

# 配置 Go 运行时
Set-AzWebApp `
  -ResourceGroupName <resource-group> `
  -Name <app-name> `
  -LinuxFxVersion "GO|1.21"
```

2. 配置环境变量
```powershell
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

3. 部署代码
```powershell
# 构建 Linux 版本的二进制文件
$env:GOOS="linux"
$env:GOARCH="amd64"
go build -o main .

# 创建部署包
Compress-Archive -Path main -DestinationPath deploy.zip -Force

# 部署到 Azure
Publish-AzWebApp `
  -ResourceGroupName <resource-group> `
  -Name <app-name> `
  -ArchivePath .\deploy.zip `
  -Force
```

## 主要依赖

- `github.com/gin-gonic/gin` - Web 框架
- `github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos` - Cosmos DB SDK
- `github.com/Azure/azure-sdk-for-go/sdk/messaging/azwebpubsub` - Web PubSub SDK
- `github.com/google/uuid` - UUID 生成
- `github.com/joho/godotenv` - 环境变量加载

## 从 TypeScript 迁移的变化

1. **类型系统**: 使用 Go 的静态类型系统替代 TypeScript
2. **并发处理**: 使用 Go 的 goroutines 和 channels
3. **错误处理**: 显式错误返回和处理
4. **JSON 序列化**: 使用结构体标签进行 JSON 映射
5. **Web 框架**: 从 Express 迁移到 Gin

## 性能优势

- 更快的启动时间
- 更低的内存占用
- 更好的并发性能
- 单一二进制文件部署

## 注意事项

- Cosmos DB 使用 `status` 作为分区键
- 状态变更时需要删除旧文档并创建新文档
- Web PubSub 事件处理需要正确设置 CORS 头
- 定期清理任务每分钟运行一次

## 许可证

MIT License
