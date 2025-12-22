# 🚀 快速参考

## 📂 目录速查

```
wechat-gomoku/
├── 📚 docs/              → 所有文档
│   ├── deployment/      → 部署文档
│   └── migration/       → 迁移指南
├── 🛠️ scripts/          → 工具脚本
├── 📱 miniprogram/      → 小程序前端
├── ⭐ backend-go/       → Go 后端（推荐）
└── 🔵 backend-nodejs/   → Node.js 后端
```

## 📖 常用文档

| 文档 | 路径 |
|------|------|
| 项目概览 | [README.md](README.md) |
| 项目结构 | [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) |
| API 文档 | [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) |
| 部署指南 | [docs/deployment/Azure部署指南.md](docs/deployment/Azure部署指南.md) |
| Go 部署 | [docs/deployment/AZURE_DEPLOY_GO.md](docs/deployment/AZURE_DEPLOY_GO.md) |
| 文档索引 | [docs/README.md](docs/README.md) |

## 🛠️ 常用命令

### 前端开发
```bash
# 编译 TypeScript
npm install
npm run build

# 监听模式
npm run watch
```

### Go 后端
```bash
cd backend-go

# 运行
go run main.go

# 编译
go build -o main .

# 测试
cd ../scripts
.\test-backend-go.ps1
```

### Node.js 后端
```bash
cd backend-nodejs

# 安装依赖
npm install

# 开发模式
npm run dev

# 编译
npm run build

# 测试
cd ../scripts
.\test-backend.ps1
```

### 部署
```powershell
# Go 后端自动部署
cd scripts
.\deploy-azure-go.ps1 -ConfigureEnv
```

## 🔧 配置文件

| 文件 | 用途 |
|------|------|
| `miniprogram/utils/config.ts` | 前端配置（切换后端） |
| `backend-go/.env` | Go 环境变量 |
| `backend-nodejs/.env` | Node.js 环境变量 |
| `tsconfig.json` | TypeScript 编译配置 |

## 🎯 快速切换后端

编辑 `miniprogram/utils/config.ts`：

```typescript
// 修改这一行
const CURRENT_BACKEND = 'go'; // 'go' 或 'nodejs'
```

## 📍 API 端点

### Go 后端（当前使用）
- 🌐 https://gomoku-api-go.azurewebsites.net
- 🏥 健康检查: `/api/health`

### Node.js 后端（备用）
- 🌐 https://gomoku-app-service-dbdzaug6ejh7e5dx.eastasia-01.azurewebsites.net
- 🏥 健康检查: `/api/health`

## 🐛 问题排查

| 问题 | 解决方案 |
|------|----------|
| TypeScript 改动未生效 | `npm run build` |
| 部署失败 | 查看 [DEPLOYMENT_FIXES.md](docs/deployment/DEPLOYMENT_FIXES.md) |
| 连接后端失败 | 检查 `config.ts` 和开发者工具设置 |

## 📞 快速帮助

- 💬 查看 [常见问题](README.md#-常见问题)
- 📚 浏览 [文档索引](docs/README.md)
- 🔍 搜索项目文件：使用 VS Code 全局搜索

## 🎓 学习路径

1. **新手入门**
   - 阅读 [README.md](README.md)
   - 查看 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
   - 了解 [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

2. **部署运维**
   - 学习 [Azure部署指南.md](docs/deployment/Azure部署指南.md)
   - 实践 Go 后端部署
   - 排查 [DEPLOYMENT_FIXES.md](docs/deployment/DEPLOYMENT_FIXES.md)

3. **深入开发**
   - 研究 [DESIGN_DOCUMENT.md](docs/DESIGN_DOCUMENT.md)
   - 学习 [MIGRATION_TO_GO.md](docs/migration/MIGRATION_TO_GO.md)
   - 优化代码性能

---

**提示**: 保存此文件到书签，方便随时查阅！
