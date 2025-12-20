# 五子棋游戏 - Azure云服务部署指南

## 📋 目录

1. [Azure服务准备](#azure服务准备)
2. [后端部署](#后端部署)
3. [小程序配置](#小程序配置)
4. [测试验证](#测试验证)
5. [常见问题](#常见问题)

---

## 🔧 Azure服务准备

### 1. 创建Azure账号

1. 访问 [Azure Portal](https://portal.azure.com)
2. 注册并登录Azure账号
3. 如果是新用户，可以获得 $200 免费额度（30天有效）

### 2. 创建资源组

```bash
# 使用Azure CLI（推荐）
az login
az group create --name gomoku-rg --location eastasia
```

或在Azure Portal中：
1. 搜索"资源组" → 点击"创建"
2. 资源组名称：`gomoku-rg`
3. 区域：选择"东亚"或"东南亚"（距离中国近）

### 3. 创建Azure Cosmos DB

#### 方式一：Azure Portal

1. 搜索"Azure Cosmos DB" → 点击"创建"
2. 选择API：**Core (SQL)**
3. 填写信息：
   - 账户名：`gomoku-cosmos-db`（全局唯一）
   - 位置：东亚
   - 容量模式：**无服务器**（推荐，按使用量付费）
4. 点击"查看 + 创建" → "创建"

#### 方式二：Azure CLI

```bash
az cosmosdb create \
  --name gomoku-cosmos-db \
  --resource-group gomoku-rg \
  --locations regionName=eastasia \
  --capabilities EnableServerless
```

#### 获取连接信息

创建完成后，在Cosmos DB页面：
1. 左侧菜单 → "密钥"
2. 复制：
   - **URI**（例如：`https://gomoku-cosmos-db.documents.azure.com:443/`）
   - **主密钥**

### 4. 创建Azure Web PubSub

#### 方式一：Azure Portal

1. 搜索"Web PubSub" → 点击"创建"
2. 填写信息：
   - 资源名称：`gomoku-pubsub`
   - 区域：东亚
   - 定价层：**免费层**（支持20个并发连接，足够测试）
3. 点击"查看 + 创建" → "创建"

#### 方式二：Azure CLI

```bash
az webpubsub create \
  --name gomoku-pubsub \
  --resource-group gomoku-rg \
  --location eastasia \
  --sku Free_F1
```

#### 获取连接字符串

创建完成后：
1. 左侧菜单 → "密钥"
2. 复制**连接字符串**（主密钥）
   - 格式：`Endpoint=https://gomoku-pubsub.webpubsub.azure.com;AccessKey=...;Version=1.0;`

---

## 🚀 后端部署

### 方式一：Azure App Service（推荐 - 最简单）

#### 1. 创建App Service

**Azure Portal：**

1. 搜索"应用服务" → 点击"创建"
2. 填写信息：
   - 应用名称：`gomoku-api`（全局唯一，会生成URL: gomoku-api.azurewebsites.net）
   - 运行时堆栈：**Node 18 LTS**
   - 操作系统：Linux
   - 定价计划：**F1（免费）**或 **B1（基本）**
3. 点击"查看 + 创建" → "创建"

**Azure CLI：**

```bash
# 创建App Service Plan
az appservice plan create \
  --name gomoku-plan \
  --resource-group gomoku-rg \
  --sku F1 \
  --is-linux

# 创建Web App
az webapp create \
  --name gomoku-api \
  --resource-group gomoku-rg \
  --plan gomoku-plan \
  --runtime "NODE:18-lts"
```

#### 2. 配置环境变量

在App Service页面：
1. 左侧菜单 → "配置" → "应用程序设置"
2. 添加以下配置：

```
COSMOS_ENDPOINT=https://gomoku-cosmos-db.documents.azure.com:443/
COSMOS_KEY=你的Cosmos DB主密钥
COSMOS_DATABASE=gomoku
COSMOS_CONTAINER=game_rooms

PUBSUB_CONNECTION_STRING=你的PubSub连接字符串
PUBSUB_HUB_NAME=gomoku

PORT=8080
NODE_ENV=production

ALLOWED_ORIGINS=https://servicewechat.com
```

#### 3. 部署代码

**方法A：使用Azure CLI**

```bash
cd backend

# 构建项目
npm install
npm run build

# 压缩文件
zip -r deploy.zip package.json package-lock.json dist/

# 部署到Azure
az webapp deployment source config-zip \
  --resource-group gomoku-rg \
  --name gomoku-api \
  --src deploy.zip
```

**方法B：使用VS Code Azure扩展**

1. 安装VS Code扩展：Azure App Service
2. 在VS Code中：
   - 按 `Ctrl+Shift+P`
   - 输入 `Azure App Service: Deploy to Web App`
   - 选择 `gomoku-api`
   - 选择 `backend` 目录

**方法C：使用GitHub Actions（自动化）**

1. 在GitHub仓库中，进入 Settings → Secrets
2. 添加密钥 `AZURE_WEBAPP_PUBLISH_PROFILE`：
   - 在Azure Portal中，进入App Service
   - 点击"获取发布配置文件"
   - 将下载的XML文件内容复制到GitHub Secrets中
3. 推送代码到GitHub主分支，会自动触发部署

#### 4. 验证部署

访问：`https://gomoku-api.azurewebsites.net/api/health`

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T..."
}
```

### 方式二：Azure Container Instances（Docker）

#### 1. 构建Docker镜像

```bash
cd backend

# 构建镜像
docker build -t gomoku-backend .

# 标记镜像
docker tag gomoku-backend gomoku.azurecr.io/gomoku-backend:latest
```

#### 2. 推送到Azure Container Registry

```bash
# 创建容器注册表
az acr create \
  --name gomoku \
  --resource-group gomoku-rg \
  --sku Basic

# 登录
az acr login --name gomoku

# 推送镜像
docker push gomoku.azurecr.io/gomoku-backend:latest
```

#### 3. 部署到Container Instances

```bash
az container create \
  --name gomoku-backend \
  --resource-group gomoku-rg \
  --image gomoku.azurecr.io/gomoku-backend:latest \
  --dns-name-label gomoku-api \
  --ports 3000 \
  --environment-variables \
    COSMOS_ENDPOINT="..." \
    COSMOS_KEY="..." \
    PUBSUB_CONNECTION_STRING="..." \
  --secure-environment-variables \
    COSMOS_KEY="..." \
  --cpu 1 \
  --memory 1
```

---

## 📱 小程序配置

### 1. 配置服务器域名

在[微信公众平台](https://mp.weixin.qq.com/)中：

1. 登录小程序后台
2. 开发 → 开发管理 → 开发设置 → 服务器域名
3. 添加以下域名：

**request合法域名：**
```
https://gomoku-api.azurewebsites.net
```

**socket合法域名：**
```
wss://gomoku-pubsub.webpubsub.azure.com
```

### 2. 修改小程序配置

编辑 `miniprogram/utils/config.ts`：

```typescript
export const API_BASE_URL = 'https://gomoku-api.azurewebsites.net';
export const PUBSUB_URL = 'wss://gomoku-pubsub.webpubsub.azure.com/client/hubs/gomoku';
```

### 3. 编译上传

1. 在微信开发者工具中点击"上传"
2. 填写版本号和项目备注
3. 提交审核

### 4. 本地测试（可选）

开发阶段，可以在 `config.ts` 中：

```typescript
const isDev = true; // 开发模式
export const config = isDev ? DEV_CONFIG : {
  API_BASE_URL,
  PUBSUB_URL
};
```

然后在开发者工具中勾选"不校验合法域名"

---

## ✅ 测试验证

### 1. 后端API测试

使用Postman或curl测试：

```bash
# 健康检查
curl https://gomoku-api.azurewebsites.net/api/health

# 创建房间
curl -X POST https://gomoku-api.azurewebsites.net/api/rooms/create \
  -H "Content-Type: application/json" \
  -d '{"userId": "test123", "nickname": "测试玩家"}'

# 获取房间列表
curl https://gomoku-api.azurewebsites.net/api/rooms
```

### 2. WebSocket测试

使用在线WebSocket测试工具或代码：

```javascript
// 先获取token
const response = await fetch('https://gomoku-api.azurewebsites.net/api/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'test123', roomId: 'room456' })
});
const { url } = await response.json();

// 连接WebSocket
const ws = new WebSocket(url);
ws.onmessage = (event) => console.log('收到消息:', event.data);
```

### 3. 小程序端到端测试

1. 使用两个微信开发者工具或真机
2. 玩家A创建房间
3. 玩家B加入房间
4. 测试对战、旁观、断线重连等功能

---

## 🐛 常见问题

### Q1: 部署后API无法访问

**A:** 检查以下几点：
1. App Service是否已启动（Azure Portal中查看状态）
2. 环境变量是否正确配置
3. 查看日志：Azure Portal → App Service → 日志流

### Q2: Cosmos DB连接失败

**A:** 
1. 检查防火墙设置：Cosmos DB → 防火墙和虚拟网络 → 允许从Azure服务访问
2. 验证URI和密钥是否正确
3. 确认已创建数据库和容器

### Q3: WebSocket连接失败

**A:**
1. 确认Web PubSub已创建并获取正确的连接字符串
2. 检查小程序域名配置是否正确
3. 查看浏览器/小程序控制台错误信息

### Q4: 小程序提示"不在以下request合法域名列表中"

**A:**
1. 在微信公众平台添加服务器域名
2. 开发阶段可以勾选"不校验合法域名"
3. 域名必须是HTTPS（wss://）

### Q5: 成本问题

**A:** 使用免费/低成本方案：
- **App Service**: F1免费层
- **Cosmos DB**: 无服务器模式（按使用量付费，轻量使用几乎免费）
- **Web PubSub**: 免费层（20并发）
- **总成本**: 低于$5/月（轻量使用场景）

### Q6: 性能优化

**A:**
1. 升级App Service计划到B1或S1
2. 启用Cosmos DB的索引优化
3. 使用Azure CDN加速静态资源
4. 考虑使用Azure Front Door做负载均衡

---

## 📊 监控和日志

### 1. 查看日志

Azure Portal → App Service → 日志流

### 2. 启用Application Insights（可选）

```bash
az monitor app-insights component create \
  --app gomoku-insights \
  --resource-group gomoku-rg \
  --location eastasia
```

### 3. 设置告警

在Azure Portal中配置：
- CPU使用率超过80%
- 内存使用率超过90%
- HTTP 5xx错误率超过5%

---

## 🔒 安全建议

1. **密钥管理**：使用Azure Key Vault存储敏感信息
2. **CORS配置**：限制允许的源域名
3. **速率限制**：添加API请求频率限制
4. **HTTPS**：强制使用HTTPS（Azure默认启用）
5. **认证**：添加用户认证机制（可选）

---

## 📚 相关资源

- [Azure App Service文档](https://docs.microsoft.com/azure/app-service/)
- [Azure Cosmos DB文档](https://docs.microsoft.com/azure/cosmos-db/)
- [Azure Web PubSub文档](https://docs.microsoft.com/azure/azure-web-pubsub/)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

---

## 💡 后续优化

- [ ] 添加CI/CD自动化部署
- [ ] 实现数据库备份策略
- [ ] 添加Redis缓存层
- [ ] 实现分布式部署
- [ ] 添加监控和告警系统

祝部署顺利！🎉
