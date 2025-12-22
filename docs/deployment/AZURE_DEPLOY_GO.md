# 五子棋游戏 Go 后端 - Azure 部署快速指南

## 概述

本指南帮助你将 Go 版本的五子棋游戏后端部署到 Azure App Service。

## 前提条件

1. **Azure 账号**: 拥有有效的 Azure 账号
2. **Azure PowerShell**: 已安装 Azure PowerShell 模块
3. **Go 1.21+**: 本地已安装 Go
4. **Azure 资源**: 已创建 Cosmos DB 和 Web PubSub 服务

## 安装 Azure PowerShell

如果还未安装 Azure PowerShell：

```powershell
# 以管理员身份运行 PowerShell
Install-Module -Name Az -AllowClobber -Scope CurrentUser
```

## 部署步骤

### 方式一：使用自动化脚本（推荐）

```powershell
# 运行部署脚本
.\backend-go\deploy-azure.ps1 `
  -ResourceGroupName "gomoku-rg" `
  -AppName "gomoku-api-go" `
  -Location "eastasia"
```

脚本会自动：
1. 检查 Azure 登录状态
2. 创建资源组（如果不存在）
3. 创建 App Service Plan（如果不存在）
4. 创建 Web App（如果不存在）
5. 构建 Go 应用
6. 打包并部署到 Azure

### 方式二：手动部署

#### 1. 登录 Azure

```powershell
Connect-AzAccount
```

#### 2. 创建资源组

```powershell
New-AzResourceGroup -Name gomoku-rg -Location eastasia
```

#### 3. 创建 App Service Plan

```powershell
New-AzAppServicePlan `
  -Name gomoku-plan-go `
  -ResourceGroupName gomoku-rg `
  -Location eastasia `
  -Linux `
  -Tier Free
```

#### 4. 创建 Web App

```powershell
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

#### 5. 构建和部署

```powershell
cd backend-go

# 构建 Linux 版本
$env:GOOS="linux"
$env:GOARCH="amd64"
$env:CGO_ENABLED="0"
go build -o main .

# 打包
Compress-Archive -Path main -DestinationPath deploy.zip -Force

# 部署
Publish-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -ArchivePath .\deploy.zip `
  -Force
```

#### 6. 配置环境变量

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

## 验证部署

### 1. 健康检查

```powershell
Invoke-RestMethod -Uri "https://gomoku-api-go.azurewebsites.net/api/health"
```

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2025-12-22T..."
}
```

### 2. 查看日志

```powershell
Get-AzWebAppLog -ResourceGroupName gomoku-rg -Name gomoku-api-go -Tail
```

### 3. 运行测试脚本

```powershell
.\backend-go\test-backend.ps1
```

## 更新部署

当代码有更新时，只需重新构建和部署：

```powershell
cd backend-go

# 重新构建
$env:GOOS="linux"
$env:GOARCH="amd64"
go build -o main .

# 重新打包和部署
Compress-Archive -Path main -DestinationPath deploy.zip -Force
Publish-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -ArchivePath .\deploy.zip `
  -Force
```

## 常见问题

### Q: 为什么需要创建新的 App Service 而不是使用现有的 Node.js App Service？

**A:** Go 和 Node.js 使用不同的运行时环境：
- Node.js App Service 需要 Node.js 运行时和 npm
- Go App Service 直接运行编译后的二进制文件
- 创建新的 App Service 可以避免配置冲突，且可以同时保留两个版本

### Q: 如何在 Go 和 Node.js 版本之间切换？

**A:** 只需修改小程序配置中的 `API_BASE_URL`：
- Go 版本: `https://gomoku-api-go.azurewebsites.net`
- Node.js 版本: `https://gomoku-api.azurewebsites.net`

### Q: 构建时出现 "cannot find GOOS=linux" 错误？

**A:** 确保正确设置了环境变量：
```powershell
$env:GOOS="linux"
$env:GOARCH="amd64"
```

### Q: 部署后无法访问 API？

**A:** 检查以下几点：
1. 确认环境变量已正确配置
2. 查看日志: `Get-AzWebAppLog -ResourceGroupName gomoku-rg -Name gomoku-api-go -Tail`
3. 确认 App Service 正在运行
4. 检查防火墙设置

### Q: 如何查看运行状态？

**A:**
```powershell
# 获取 App Service 信息
Get-AzWebApp -ResourceGroupName gomoku-rg -Name gomoku-api-go

# 重启 App Service
Restart-AzWebApp -ResourceGroupName gomoku-rg -Name gomoku-api-go
```

## 性能优化

### 升级到付费层

免费层有一些限制，如果需要更好的性能：

```powershell
Set-AzAppServicePlan `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-plan-go `
  -Tier Basic `
  -WorkerSize Small
```

### 启用 Application Insights

```powershell
# 创建 Application Insights
New-AzApplicationInsights `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-insights `
  -Location eastasia `
  -Kind web

# 获取 Instrumentation Key 并配置
$insights = Get-AzApplicationInsights -ResourceGroupName gomoku-rg -Name gomoku-insights
Set-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -AppSettings @{APPINSIGHTS_INSTRUMENTATIONKEY=$insights.InstrumentationKey}
```

## 监控和维护

### 设置告警

```powershell
# CPU 使用率告警
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

### 定期备份

```powershell
# 创建备份
New-AzWebAppBackup `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -StorageAccountUrl "your-storage-account-url" `
  -BackupName "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
```

## 成本估算

使用免费层资源：
- App Service (F1): 免费
- Cosmos DB (Serverless): ~$0.25/百万次操作
- Web PubSub (Free): 免费（20并发）
- **总成本**: 轻量使用场景下约 $1-5/月

## 相关资源

- [Azure App Service 文档](https://docs.microsoft.com/azure/app-service/)
- [Azure PowerShell 文档](https://docs.microsoft.com/powershell/azure/)
- [Go 应用部署指南](https://docs.microsoft.com/azure/app-service/quickstart-golang)

---

如有问题，请参考主文档 [Azure部署指南.md](./Azure部署指南.md)
