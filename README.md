# 五子棋联机对战 - 快速开始

本项目是一个基于微信小程序的在线五子棋对战游戏，支持实时联机对战、房间管理、WebSocket 实时通信等功能。

## 📦 项目结构

```
wechat-gomoku/
├── miniprogram/              # 微信小程序前端
│   ├── pages/               # 页面目录
│   │   ├── index/          # 首页（模式选择）
│   │   ├── lobby/          # 联机大厅（房间列表）
│   │   └── game/           # 游戏页面（棋盘界面）
│   ├── utils/              # 工具类
│   │   ├── config.ts       # 配置文件（支持多后端切换）
│   │   ├── api.ts          # API 请求封装
│   │   └── websocket.ts    # WebSocket 管理
│   └── app.ts              # 小程序入口
│
├── backend-go/              # Go 后端（推荐 ⭐）
│   ├── main.go             # 主入口
│   ├── config/             # 数据库和 PubSub 配置
│   ├── services/           # 业务逻辑（房间、游戏、清理）
│   ├── routes/             # API 路由
│   ├── types/              # 数据类型定义
│   └── go.mod              # Go 依赖管理
│
├── backend-nodejs/          # Node.js 后端（备用）
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── services/       # 业务逻辑
│   │   └── routes/         # API 路由
│   └── package.json        # npm 依赖管理
│
├── docs/                    # 📚 项目文档
│   ├── deployment/         # 部署相关文档
│   ├── migration/          # 迁移指南
│   ├── API_DOCUMENTATION.md
│   └── DESIGN_DOCUMENT.md
│
├── scripts/                 # 🛠️ 工具脚本
│   ├── deploy-azure-go.ps1 # Go 后端自动部署脚本
│   ├── test-backend.ps1    # Node.js 后端测试脚本
│   ├── test-backend-go.ps1 # Go 后端测试脚本
│   └── database-init.js    # 数据库初始化脚本
│
└── typings/                 # TypeScript 类型定义
```

## 🎯 后端版本选择

### ⭐ Go 版本（推荐）

**优势：**
- ⚡ **性能卓越** - 更快的响应速度，更低的内存占用
- 🚀 **快速启动** - 秒级启动，冷启动延迟更低
- 📦 **部署简单** - 编译为单一二进制文件
- 🔧 **原生并发** - goroutine 提供更好的并发处理

**部署状态：**
- ✅ 已部署到 Azure App Service
- 🌐 API 地址: `https://gomoku-api-go.azurewebsites.net`

**快速部署：**
```powershell
cd scripts
.\deploy-azure-go.ps1 -ConfigureEnv
```

**文档：** [docs/deployment/AZURE_DEPLOY_GO.md](docs/deployment/AZURE_DEPLOY_GO.md)

### 🔵 Node.js 版本（备用）

**优势：**
- 📚 成熟的生态系统
- 🔄 可作为备份方案

**部署状态：**
- ✅ 已部署到 Azure App Service
- 🌐 API 地址: `https://gomoku-app-service-dbdzaug6ejh7e5dx.eastasia-01.azurewebsites.net`

**文档：** [docs/deployment/Azure部署指南.md](docs/deployment/Azure部署指南.md)

### 🔄 后端切换

前端配置支持快速切换后端，编辑 [`miniprogram/utils/config.ts`](miniprogram/utils/config.ts)：

```typescript
// 修改这一行来切换后端
const CURRENT_BACKEND: keyof typeof BACKEND_CONFIGS = 'go'; // 'go' 或 'nodejs'
```

## 🚀 快速开始
- ✅ 只做微信小程序
- ✅ 想要快速上线
- ✅ 不熟悉后端开发
- ✅ 小规模项目

**配置时间：** 15-30分钟  

## 🚀 快速开始

### 1️⃣ 克隆项目

```bash
git clone https://github.com/your-username/wechat-gomoku.git
cd wechat-gomoku
```

### 2️⃣ 安装依赖

```bash
# 安装根目录依赖（TypeScript 编译）
npm install

# 编译 TypeScript 代码
npm run build

# 或使用监听模式
npm run watch
```

### 3️⃣ 配置后端

#### 方式 A：使用已部署的 Go 后端（推荐）

前端配置已默认指向 Go 后端，无需额外配置即可使用。

#### 方式 B：部署自己的后端

**Go 后端部署：**
```powershell
cd scripts
.\deploy-azure-go.ps1 -ConfigureEnv
```

**Node.js 后端部署：**
查看 [docs/deployment/Azure部署指南.md](docs/deployment/Azure部署指南.md)

### 4️⃣ 配置小程序

1. 使用微信开发者工具打开 `miniprogram` 目录
2. 配置 AppID（或使用测试号）
3. 在**详情 > 本地设置**中勾选：
   - ☑️ 不校验合法域名
   - ☑️ 启用调试模式

### 5️⃣ 运行测试

**测试后端 API：**
```powershell
# 测试 Go 后端
cd scripts
.\test-backend-go.ps1

# 测试 Node.js 后端
.\test-backend.ps1
```

**运行小程序：**
点击微信开发者工具的"编译"按钮，开始体验游戏！

---

## 🎮 功能特点

### 🎯 双模式支持
- **本地对战** - 无需网络，两人同设备轮流下棋
- **联机对战** - 实时在线对战，支持房间系统

### ⚡ 联机对战特性
- ✅ **实时同步** - WebSocket 实时通信，延迟 < 500ms
- ✅ **房间系统** - 创建/加入/查找房间
- ✅ **玩家昵称** - 自定义显示名称
- ✅ **自动分配** - 先进房间者执黑（先手）
- ✅ **旁观模式** - 房间满员后可旁观
- ✅ **权限控制** - 轮到自己才能下棋
- ✅ **胜负判定** - 五子连珠自动判定
- ✅ **自动清理** - 无活动房间自动回收

### 🎲 游戏规则
- 15×15 标准棋盘
- 黑方先手
- 先连成五子者获胜
- 横、竖、斜四个方向均可
- 棋盘下满无胜者为平局

---

## 📚 文档导航

### 核心文档
- 📖 [API 接口文档](docs/API_DOCUMENTATION.md)
- 🏗️ [系统设计文档](docs/DESIGN_DOCUMENT.md)
- 📚 [文档索引](docs/README.md)

### 部署指南
- 🚀 [Azure 部署指南](docs/deployment/Azure部署指南.md)
- ⭐ [Go 后端部署](docs/deployment/AZURE_DEPLOY_GO.md)
- 🔧 [部署问题修复](docs/deployment/DEPLOYMENT_FIXES.md)

### 迁移文档
- 🔄 [TypeScript 到 Go 迁移指南](docs/migration/MIGRATION_TO_GO.md)

### 其他
- ☁️ [云服务方案对比](docs/云服务方案对比.md)
- 📝 [云开发配置说明](docs/云开发配置说明.md)（已停用）

---

## 🛠️ 技术栈

### 前端（微信小程序）
- **语言**: TypeScript
- **框架**: 微信小程序原生框架
- **实时通信**: WebSocket
- **构建**: 微信开发者工具

### 后端 - Go 版本（推荐）
- **语言**: Go 1.21
- **框架**: Gin Web Framework
- **数据库**: Azure Cosmos DB (NoSQL)
- **实时通信**: Azure Web PubSub (WebSocket)
- **部署**: Azure App Service (Linux)

### 后端 - Node.js 版本
- **语言**: TypeScript / Node.js 18
- **框架**: Express.js
- **数据库**: Azure Cosmos DB (NoSQL)
- **实时通信**: Azure Web PubSub (WebSocket)
- **部署**: Azure App Service (Linux)

### 基础设施
- **云平台**: Microsoft Azure
- **数据库**: Cosmos DB（分区键: /status）
- **实时通信**: Web PubSub Service
- **容器化**: Docker
- **CI/CD**: PowerShell 自动化脚本

---

## 🧪 API 测试

### 健康检查
```bash
# Go 后端
curl https://gomoku-api-go.azurewebsites.net/api/health

# Node.js 后端  
curl https://gomoku-app-service-dbdzaug6ejh7e5dx.eastasia-01.azurewebsites.net/api/health
```

### 使用测试脚本
```powershell
# 测试 Go 后端（推荐）
cd scripts
.\test-backend-go.ps1

# 测试 Node.js 后端
.\test-backend.ps1
```

---

## 📱 测试建议

### 联机功能测试
1. **两个开发者工具** - 打开两个实例同时运行
2. **开发者工具 + 真机** - 创建房间后手机扫码加入
3. **两台真机** - 最真实的测试体验

### 旁观功能测试
让三个或更多用户加入同一房间，前两个成为玩家，后续成为旁观者

---

## 🐛 常见问题

### Q: 如何切换后端？
**A:** 编辑 `miniprogram/utils/config.ts`，修改 `CURRENT_BACKEND`：
```typescript
const CURRENT_BACKEND = 'go'; // 'go' 或 'nodejs'
```

### Q: TypeScript 修改后没生效？
**A:** 编译 TypeScript 代码：
```bash
npm run build     # 或
npm run watch     # 监听模式
```

### Q: 部署失败怎么办？
**A:** 查看文档：
- [DEPLOYMENT_FIXES.md](docs/deployment/DEPLOYMENT_FIXES.md)
- [Azure部署指南.md](docs/deployment/Azure部署指南.md)

### Q: 前端连接不上后端？
**A:** 检查：
1. 后端服务正常（访问 `/api/health`）
2. `config.ts` 中的 API 地址
3. 开发者工具中勾选"不校验合法域名"
4. 控制台错误信息

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范
- TypeScript 使用 ESLint
- Go 使用 `gofmt` 和 `golint`
- 提交信息遵循 Conventional Commits

---

## 🎯 功能规划

- [ ] 添加聊天功能
- [ ] 房间密码保护
- [ ] 游戏回放系统
- [ ] 排行榜
- [ ] AI 对战模式
- [ ] 自定义棋盘大小
- [ ] 禁手规则支持
- [ ] 计时功能

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 🙏 致谢

- 微信小程序平台
- Microsoft Azure
- Go 语言社区
- TypeScript 社区

---

**⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！**
