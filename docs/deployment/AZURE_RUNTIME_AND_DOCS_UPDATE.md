# 关于 Azure App Service 运行时和文档更新的说明

## 问题 1: 是否需要重新创建 Azure App Service？

### 简短答案：是的，建议创建新的 App Service

### 详细说明

你当前的 Azure App Service 使用 **Node.js 运行时**，而 Go 应用需要 **Go 运行时**。虽然技术上可以修改现有 App Service 的运行时设置，但**强烈建议创建新的 App Service**，原因如下：

#### 1. **运行时环境完全不同**
- **Node.js App Service**: 
  - 需要 Node.js 运行时环境
  - 部署 `node_modules` 和源代码
  - 使用 `npm start` 启动
  - 需要配置 `package.json` 的 scripts

- **Go App Service**:
  - 运行编译后的二进制文件
  - 无需任何运行时依赖
  - 直接执行二进制文件
  - 部署文件只有一个可执行文件

#### 2. **避免配置冲突**
修改现有 App Service 可能导致：
- 启动脚本冲突
- 端口配置问题
- 环境变量混淆
- 难以回滚

#### 3. **保留回退选项**
创建新的 App Service 可以：
- 同时运行两个版本（A/B 测试）
- 快速回退到 Node.js 版本
- 对比性能差异
- 零停机迁移

### 推荐方案

```powershell
# 创建新的 App Service Plan 和 Web App（Go 版本）
New-AzAppServicePlan `
  -Name gomoku-plan-go `
  -ResourceGroupName gomoku-rg `
  -Location eastasia `
  -Linux `
  -Tier Free

New-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `        # 注意：使用不同的名称
  -Location eastasia `
  -AppServicePlan gomoku-plan-go

# 配置 Go 运行时
Set-AzWebApp `
  -ResourceGroupName gomoku-rg `
  -Name gomoku-api-go `
  -LinuxFxVersion "GO|1.21"
```

这样你就有两个 App Service：
- **gomoku-api**: Node.js 版本 (https://gomoku-api.azurewebsites.net)
- **gomoku-api-go**: Go 版本 (https://gomoku-api-go.azurewebsites.net)

### 迁移步骤

1. **创建新的 Go App Service**（使用上面的命令或自动脚本）

2. **部署 Go 应用**
   ```powershell
   .\backend-go\deploy-azure.ps1 `
     -ResourceGroupName "gomoku-rg" `
     -AppName "gomoku-api-go"
   ```

3. **配置环境变量**（与 Node.js 版本相同的 Cosmos DB 和 PubSub 配置）

4. **测试 Go 版本**
   ```powershell
   Invoke-RestMethod -Uri "https://gomoku-api-go.azurewebsites.net/api/health"
   ```

5. **更新小程序配置**
   ```typescript
   // miniprogram/utils/config.ts
   export const API_BASE_URL = 'https://gomoku-api-go.azurewebsites.net';
   ```

6. **验证功能正常后，可选择保留或删除 Node.js 版本**
   ```powershell
   # 如果确认不再需要 Node.js 版本
   Remove-AzWebApp -ResourceGroupName gomoku-rg -Name gomoku-api -Force
   ```

---

## 问题 2: 文档更新 - Azure CLI 改为 PowerShell

### 已完成的更新

所有项目文档中的 Azure CLI 命令已经全部替换为 Azure PowerShell cmdlet：

#### ✅ 更新的文件列表

1. **[Azure部署指南.md](./Azure部署指南.md)**
   - ✅ 资源组创建: `az group create` → `New-AzResourceGroup`
   - ✅ Cosmos DB: `az cosmosdb create` → `New-AzCosmosDBAccount`
   - ✅ Web PubSub: `az webpubsub create` → `New-AzWebPubSub`
   - ✅ App Service Plan: `az appservice plan create` → `New-AzAppServicePlan`
   - ✅ Web App: `az webapp create` → `New-AzWebApp`
   - ✅ 部署: `az webapp deployment` → `Publish-AzWebApp`
   - ✅ Container Registry: `az acr create` → `New-AzContainerRegistry`
   - ✅ 配置: `az webapp config` → `Set-AzWebApp`
   - ✅ 日志: 添加了 `Get-AzWebAppLog`
   - ✅ 监控: 添加了 Application Insights 和告警的 PowerShell 命令

2. **[backend-go/README.md](../backend-go/README.md)**
   - ✅ 部署命令全部改为 PowerShell
   - ✅ 添加了完整的 PowerShell 部署流程

3. **[MIGRATION_TO_GO.md](../migration/MIGRATION_TO_GO.md)**
   - ✅ Azure 部署部分改为 PowerShell
   - ✅ 添加了环境变量配置的 PowerShell 示例

4. **[AZURE_DEPLOY_GO.md](./AZURE_DEPLOY_GO.md)** ⭐ **新建**
   - ✅ 完整的 PowerShell 部署指南
   - ✅ 详细的步骤说明
   - ✅ 常见问题解答
   - ✅ 性能优化建议

5. **[backend-go/deploy-azure.ps1](../backend-go/deploy-azure.ps1)** ⭐ **新建**
   - ✅ 自动化部署脚本
   - ✅ 自动创建资源
   - ✅ 自动构建和部署
   - ✅ 友好的提示信息

6. **[README.md](../README.md)**
   - ✅ 更新了项目结构
   - ✅ 添加了 Go 版本说明
   - ✅ 更新了快速部署命令

### PowerShell vs Azure CLI 对照表

| 功能 | Azure CLI | Azure PowerShell |
|------|-----------|------------------|
| 登录 | `az login` | `Connect-AzAccount` |
| 创建资源组 | `az group create --name ... --location ...` | `New-AzResourceGroup -Name ... -Location ...` |
| 创建 Web App | `az webapp create --name ... --resource-group ...` | `New-AzWebApp -Name ... -ResourceGroupName ...` |
| 配置环境变量 | `az webapp config appsettings set --settings ...` | `Set-AzWebApp -AppSettings @{...}` |
| 部署代码 | `az webapp deployment source config-zip --src ...` | `Publish-AzWebApp -ArchivePath ...` |
| 查看日志 | `az webapp log tail --name ...` | `Get-AzWebAppLog -Name ... -Tail` |

### 使用自动化脚本快速部署

现在你可以使用一条命令完成所有部署：

```powershell
# 自动部署 Go 后端到 Azure
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
5. 构建 Linux 版本的 Go 应用
6. 打包并部署到 Azure
7. 显示后续配置步骤

---

## 总结

### ✅ 关于运行时问题

**答案：需要创建新的 App Service**

- Node.js 和 Go 使用不同的运行时环境
- 创建新的 App Service 可以避免冲突并保留回退选项
- 两个版本可以并行运行，方便对比和切换
- URL 分别为：
  - Node.js: `https://gomoku-api.azurewebsites.net`
  - Go: `https://gomoku-api-go.azurewebsites.net`

### ✅ 关于文档更新

**答案：所有文档已更新为 PowerShell**

- ✅ 所有 Azure CLI 命令已替换为 PowerShell cmdlet
- ✅ 新增了自动化部署脚本
- ✅ 新增了详细的 PowerShell 部署指南
- ✅ 更新了所有相关文档

### 🚀 下一步操作

1. **运行自动部署脚本**
   ```powershell
   .\backend-go\deploy-azure.ps1 `
     -ResourceGroupName "gomoku-rg" `
     -AppName "gomoku-api-go"
   ```

2. **配置环境变量**（脚本运行后会提示）
   ```powershell
   $settings = @{
       COSMOS_ENDPOINT="https://gomoku-cosmos-db.documents.azure.com:443/"
       COSMOS_KEY="你的密钥"
       COSMOS_DATABASE="gomoku"
       COSMOS_CONTAINER="game_rooms"
       PUBSUB_CONNECTION_STRING="你的连接字符串"
       PUBSUB_HUB_NAME="gomoku"
       PORT="8080"
       NODE_ENV="production"
   }
   
   Set-AzWebApp `
     -ResourceGroupName gomoku-rg `
     -Name gomoku-api-go `
     -AppSettings $settings
   ```

3. **验证部署**
   ```powershell
   Invoke-RestMethod -Uri "https://gomoku-api-go.azurewebsites.net/api/health"
   ```

4. **更新小程序配置并测试**

---

## 参考文档

- [AZURE_DEPLOY_GO.md](./AZURE_DEPLOY_GO.md) - Go 版本 Azure 部署完整指南
- [Azure部署指南.md](./Azure部署指南.md) - 通用 Azure 部署指南（已更新为 PowerShell）
- [MIGRATION_TO_GO.md](../migration/MIGRATION_TO_GO.md) - 迁移说明和对比

如有任何问题，欢迎查看上述文档或运行自动部署脚本！
