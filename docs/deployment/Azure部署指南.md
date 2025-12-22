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

```powershell
# 使用Azure PowerShell（推荐）
Connect-AzAccount
New-AzResourceGroup -Name gomoku-rg -Location eastasia
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

#### 方式二：Azure PowerShell

```powershell
$locations = @(
    @{
        locationName="East Asia";
        failoverPriority=0;
        isZoneRedundant=$false
    }
)

New-AzCosmosDBAccount `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-cosmos-db `
  -Location "East Asia" `
  -ApiKind Sql `
  -ServerVersion 4.0 `
  -Locations $locations `
  -Capability @("EnableServerless")
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

#### 方式二：Azure PowerShell

```powershell
New-AzWebPubSub `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-pubsub `
  -Location eastasia `
  -Sku Free_F1
```

#### 获取连接字符串

创建完成后：
1. 左侧菜单 → "密钥"
2. 复制**连接字符串**（主密钥）
   - 格式：`Endpoint=https://gomoku-pubsub.webpubsub.azure.com;AccessKey=...;Version=1.0;`

---

## 🚀 后端部署

### 方式一：Azure App Service（推荐 - 最简单）

> **注意**: 本项目提供两个后端版本：
> - **backend/** - Node.js/TypeScript 版本
> - **backend-go/** - Go 版本（推荐，性能更好）
>
> 建议为 Go 版本创建新的 App Service，以便保留 Node.js 版本用于回退。

#### 选项A：部署 Go 后端（推荐）

##### 1. 创建 App Service（Go 运行时）

**Azure Portal：**

1. 搜索"应用服务" → 点击"创建"
2. 填写信息：
   - 应用名称：`gomoku-api-go`（全局唯一）
   - 发布：**代码**
   - 运行时堆栈：**Go 1.21**
   - 操作系统：**Linux**
   - 定价计划：**F1（免费）**或 **B1（基本）**
3. 点击"查看 + 创建" → "创建"

**Azure PowerShell：**

```powershell
# 创建App Service Plan
New-AzAppServicePlan `
  -Name gomoku-plan-go `
  -ResourceGroupName gomoku-rg `
  -Location eastasia `
  -Linux `
  -Tier Free

# 创建Web App
New-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -Location eastasia `
  -AppServicePlan gomoku-plan-go

# 配置 Go 运行时
Set-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -LinuxFxVersion "GO|1.21"
```

##### 2. 配置环境变量（Go 版本）

在 App Service 页面：
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

**使用 PowerShell 配置：**

```powershell
$settings = @{
    COSMOS_ENDPOINT="https://gomoku-cosmos-db.documents.azure.com:443/"
    COSMOS_KEY="你的Cosmos DB主密钥"
    COSMOS_DATABASE="gomoku"
    COSMOS_CONTAINER="game_rooms"
    PUBSUB_CONNECTION_STRING="你的PubSub连接字符串"
    PUBSUB_HUB_NAME="gomoku"
    PORT="8080"
    NODE_ENV="production"
    ALLOWED_ORIGINS="https://servicewechat.com"
}

Set-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -AppSettings $settings
```

##### 3. 部署 Go 代码

**方法A：本地构建后部署（推荐）**

```powershell
cd backend-go

# 构建 Linux 版本的二进制文件
$env:GOOS="linux"
$env:GOARCH="amd64"
go build -o main .

# 创建部署包
Compress-Archive -Path main -DestinationPath deploy.zip -Force

# 部署到 Azure
Publish-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -ArchivePath .\deploy.zip `
  -Force
```

**方法B：使用 Docker**

```powershell
cd backend-go

# 构建 Docker 镜像
docker build -t gomoku-backend-go .

# 推送到 Azure Container Registry（需先创建 ACR）
az acr login --name <你的ACR名称>
docker tag gomoku-backend-go <你的ACR名称>.azurecr.io/gomoku-backend-go:latest
docker push <你的ACR名称>.azurecr.io/gomoku-backend-go:latest

# 配置 Web App 使用容器
Set-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -ContainerImageName "<你的ACR名称>.azurecr.io/gomoku-backend-go:latest"
```

#### 选项B：部署 Node.js 后端（原版本）

##### 1. 创建 App Service（Node.js 运行时）

**Azure Portal：**

1. 搜索"应用服务" → 点击"创建"
2. 填写信息：
   - 应用名称：`gomoku-api`（全局唯一）
   - 运行时堆栈：**Node 18 LTS**
   - 操作系统：Linux
   - 定价计划：**F1（免费）**或 **B1（基本）**
3. 点击"查看 + 创建" → "创建"

**Azure PowerShell：**

```powershell
# 创建App Service Plan
New-AzAppServicePlan `
  -Name gomoku-plan `
  -ResourceGroupName gomoku-rg `
  -Location eastasia `
  -Linux `
  -Tier Free

# 创建Web App
New-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api `
  -Location eastasia `
  -AppServicePlan gomoku-plan

# 配置 Node.js 运行时
Set-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api `
  -LinuxFxVersion "NODE|18-lts"
```

##### 2. 配置环境变量（Node.js 版本）

在 App Service 页面：
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

**使用 PowerShell 配置：**

```powershell
$settings = @{
    COSMOS_ENDPOINT="https://gomoku-cosmos-db.documents.azure.com:443/"
    COSMOS_KEY="你的Cosmos DB主密钥"
    COSMOS_DATABASE="gomoku"
    COSMOS_CONTAINER="game_rooms"
    PUBSUB_CONNECTION_STRING="你的PubSub连接字符串"
    PUBSUB_HUB_NAME="gomoku"
    PORT="8080"
    NODE_ENV="production"
    ALLOWED_ORIGINS="https://servicewechat.com"
}

Set-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api `
  -AppSettings $settings
```

##### 3. 部署 Node.js 代码

**方法A：使用 PowerShell**

```powershell
cd backend

# 构建项目
npm install
npm run build

# 压缩文件
Compress-Archive -Path package.json,package-lock.json,dist -DestinationPath deploy.zip -Force

# 部署到Azure
Publish-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api `
  -ArchivePath .\deploy.zip `
  -Force
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

**Go 版本：**
访问：`https://gomoku-api-go.azurewebsites.net/api/health`

**Node.js 版本：**
访问：`https://gomoku-api.azurewebsites.net/api/health`

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2025-12-22T..."
}
```

### 方式二：Azure Container Instances（Docker）

#### 1. 构建 Docker 镜像

```powershell
# Go 版本
cd backend-go
docker build -t gomoku-backend-go .
docker tag gomoku-backend-go gomokuacr.azurecr.io/gomoku-backend-go:latest

# 或 Node.js 版本
cd backend
docker build -t gomoku-backend .
docker tag gomoku-backend gomokuacr.azurecr.io/gomoku-backend:latest
```

#### 2. 推送到 Azure Container Registry

```powershell
# 创建容器注册表
New-AzContainerRegistry `
  -ResourceGroupName gomoku-rg `
  -Name gomokuacr `
  -Sku Basic `
  -Location eastasia

# 获取登录凭据
$creds = Get-AzContainerRegistryCredential -ResourceGroupName gomoku-rg -Name gomokuacr

# 登录
docker login gomokuacr.azurecr.io -u $creds.Username -p $creds.Password

# 推送镜像（Go 版本）
docker push gomokuacr.azurecr.io/gomoku-backend-go:latest

# 或推送 Node.js 版本
docker push gomokuacr.azurecr.io/gomoku-backend:latest
```

#### 3. 部署到 Container Instances

```powershell
# 设置环境变量
$envVars = @(
    (New-AzContainerInstanceEnvironmentVariableObject -Name "COSMOS_ENDPOINT" -Value "https://gomoku-cosmos-db.documents.azure.com:443/"),
    (New-AzContainerInstanceEnvironmentVariableObject -Name "COSMOS_DATABASE" -Value "gomoku"),
    (New-AzContainerInstanceEnvironmentVariableObject -Name "COSMOS_CONTAINER" -Value "game_rooms"),
    (New-AzContainerInstanceEnvironmentVariableObject -Name "PUBSUB_HUB_NAME" -Value "gomoku"),
    (New-AzContainerInstanceEnvironmentVariableObject -Name "PORT" -Value "3000")
)

# 设置安全环境变量
$secureEnvVars = @(
    (New-AzContainerInstanceEnvironmentVariableObject -Name "COSMOS_KEY" -SecureValue (ConvertTo-SecureString "你的Cosmos DB主密钥" -AsPlainText -Force)),
    (New-AzContainerInstanceEnvironmentVariableObject -Name "PUBSUB_CONNECTION_STRING" -SecureValue (ConvertTo-SecureString "你的PubSub连接字符串" -AsPlainText -Force))
)

# 创建容器实例（Go 版本）
New-AzContainerGroup `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-backend-go `
  -Image gomokuacr.azurecr.io/gomoku-backend-go:latest `
  -DnsNameLabel gomoku-api-go `
  -Port @(3000) `
  -RegistryCredential (New-AzContainerGroupImageRegistryCredentialObject -Server gomokuacr.azurecr.io -Username $creds.Username -Password (ConvertTo-SecureString $creds.Password -AsPlainText -Force)) `
  -EnvironmentVariable ($envVars + $secureEnvVars) `
  -Cpu 1 `
  -MemoryInGB 1 `
  -Location eastasia
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
// Go 版本（推荐）
export const API_BASE_URL = 'https://gomoku-api-go.azurewebsites.net';

// 或 Node.js 版本
// export const API_BASE_URL = 'https://gomoku-api.azurewebsites.net';

export const PUBSUB_URL = 'wss://gomoku-pubsub.webpubsub.azure.com/client/hubs/gomoku';

export const config = {
  API_BASE_URL,
  PUBSUB_URL
};
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

使用 PowerShell 或 curl 测试：

```powershell
# Go 版本健康检查
Invoke-RestMethod -Uri "https://gomoku-api-go.azurewebsites.net/api/health" -Method Get

# Node.js 版本健康检查
Invoke-RestMethod -Uri "https://gomoku-api.azurewebsites.net/api/health" -Method Get

# 创建房间
$body = @{
    userId = "test123"
    nickname = "测试玩家"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://gomoku-api-go.azurewebsites.net/api/rooms/create" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"

# 获取房间列表
Invoke-RestMethod -Uri "https://gomoku-api-go.azurewebsites.net/api/rooms" -Method Get
```

**或使用 curl：**

```bash
# 健康检查
curl https://gomoku-api-go.azurewebsites.net/api/health

# 创建房间
curl -X POST https://gomoku-api-go.azurewebsites.net/api/rooms/create \
  -H "Content-Type: application/json" \
  -d '{"userId": "test123", "nickname": "测试玩家"}'

# 获取房间列表
curl https://gomoku-api-go.azurewebsites.net/api/rooms
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

**Azure Portal：** 应用服务 → 日志流

**PowerShell：**

```powershell
# 查看实时日志（Go 版本）
Get-AzWebAppLog `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -Tail

# 查看实时日志（Node.js 版本）
Get-AzWebAppLog `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api `
  -Tail
```

### 2. 启用 Application Insights（可选）

```powershell
# 创建 Application Insights
New-AzApplicationInsights `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-insights `
  -Location eastasia `
  -Kind web

# 获取 Instrumentation Key
$insights = Get-AzApplicationInsights -ResourceGroupName gomoku-rg -Name gomoku-insights
$instrumentationKey = $insights.InstrumentationKey

# 配置 Web App 使用 Application Insights
Set-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -AppSettings @{APPINSIGHTS_INSTRUMENTATIONKEY=$instrumentationKey}
```

### 3. 设置告警

```powershell
# 创建 CPU 使用率告警
Add-AzMetricAlertRuleV2 `
  -Name "High-CPU-Alert" `
  -ResourceGroupName gomoku-rg `
  -TargetResourceId (Get-AzWebApp -ResourceGroupName gomoku-rg -Name gomoku-api-go).Id `
  -Condition (New-AzMetricAlertRuleV2Criteria `
    -MetricName "CpuPercentage" `
    -TimeAggregation Average `
    -Operator GreaterThan `
    -Threshold 80) `
  -WindowSize (New-TimeSpan -Minutes 5) `
  -Frequency (New-TimeSpan -Minutes 1) `
  -Severity 2
```

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
