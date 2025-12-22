# 部署问题修复记录

## 问题概述

在首次部署 Go 后端到 Azure App Service 时遇到了多个编译和配置错误。

## 错误列表及修复方案

### 1. Cosmos DB API 参数顺序错误

**错误信息：**
```
services/cleanup.go:85:26: cannot use room.ID (variable of type string) as azcosmos.PartitionKey value in argument to container.DeleteItem
services/cleanup.go:112:27: cannot use room.ID (variable of type string) as azcosmos.PartitionKey value in argument to container.DeleteItem
...
```

**原因：**
Cosmos DB SDK 的 `DeleteItem` 和 `ReplaceItem` 方法参数顺序为 `(ctx, partitionKey, itemId, options)`，但代码中写成了 `(ctx, itemId, partitionKey, options)`。

**修复：**
- services/cleanup.go (4 处)
  - Line 85: `container.DeleteItem(ctx, partitionKey, room.ID, nil)`
  - Line 112: `container.DeleteItem(ctx, partitionKeyOld, room.ID, nil)`
  - Line 121: `container.ReplaceItem(ctx, partitionKey, room.ID, roomJSON, nil)`
  - Line 182: `container.DeleteItem(ctx, partitionKey, room.ID, nil)`
  
- services/game.go (2 处)
  - Line 86: `container.DeleteItem(ctx, partitionKeyOld, room.ID, nil)`
  - Line 95: `container.ReplaceItem(ctx, partitionKey, room.ID, roomJSON, nil)`
  - Line 179: `container.DeleteItem(ctx, partitionKeyOld, room.ID, nil)`
  - Line 188: `container.ReplaceItem(ctx, partitionKey, room.ID, roomJSON, nil)`

### 2. 部署脚本路径问题

**错误信息：**
```
Set-Location : Cannot find path 'C:\Users\xiaohuang\others\wechat-gomoku\backend-go\backend-go'
```

**原因：**
脚本在运行时已经在 backend-go 目录中，但脚本内又尝试 `cd backend-go`。

**修复：**
删除了 deploy-azure.ps1 中不必要的 `Set-Location -Path "backend-go"` 行。

### 3. 部署包路径问题

**错误信息：**
```
Could not find file 'C:\Users\xiaohuang\others\wechat-gomoku\deploy.zip'
```

**原因：**
Publish-AzWebApp 需要绝对路径，但脚本提供的是相对路径。

**修复：**
```powershell
$deployZipPath = Join-Path $originalLocation "deploy.zip"
Compress-Archive -Path main -DestinationPath $deployZipPath -Force
Publish-AzWebApp -ArchivePath $deployZipPath
```

### 4. 环境变量配置路径问题

**错误信息：**
```
未找到 .env 文件: C:\Users\xiaohuang\others\wechat-gomoku\backend-go\backend-go\.env
```

**原因：**
脚本试图在 `backend-go/backend-go/.env` 路径查找文件（路径重复）。

**修复：**
```powershell
$envFile = Join-Path $originalLocation ".env"  # 而不是 "backend-go" ".env"
```

### 5. LinuxFxVersion 未配置

**问题：**
部署后访问 API 返回 404，检查发现 LinuxFxVersion 为空。

**原因：**
- `New-AzWebApp` 不支持 `-Runtime` 参数
- `Set-AzWebApp` 不支持 `-LinuxFxVersion` 参数
- `az CLI` 需要重新登录

**修复方案：**
使用 Azure Resource API 直接配置：
```powershell
$resource = Get-AzResource -ResourceGroupName $ResourceGroupName -ResourceName "$AppName/web" -ResourceType Microsoft.Web/sites/config -ApiVersion 2022-03-01
$properties = $resource.Properties
$properties.linuxFxVersion = "GO|1.21"
Set-AzResource -ResourceId $resource.ResourceId -Properties $properties -ApiVersion 2022-03-01 -Force
```

### 6. 启动命令配置

**问题：**
即使 LinuxFxVersion 正确，应用仍未启动。

**修复：**
配置启动命令为 `./main`：
```powershell
$resource = Get-AzResource -ResourceGroupName $ResourceGroupName -ResourceName "$AppName/web" -ResourceType Microsoft.Web/sites/config -ApiVersion 2022-03-01
$properties = $resource.Properties
$properties.appCommandLine = "./main"
Set-AzResource -ResourceId $resource.ResourceId -Properties $properties -ApiVersion 2022-03-01 -Force
```

## 最终验证

部署成功后，健康检查返回正常：

```bash
GET https://gomoku-api-go.azurewebsites.net/api/health
=> 200 OK
{
  "status": "ok",
  "timestamp": "0001-01-01T00:00:00Z"
}
```

创建房间 API 也正常工作：

```bash
POST https://gomoku-api-go.azurewebsites.net/api/rooms/create
Content-Type: application/json
{
  "userId": "test-user",
  "nickname": "测试用户"
}

=> 200 OK
{
  "id": "c580c937-48da-466d-ac7a-24004539d0d6",
  "roomNumber": 2924,
  "creator": {
    "userId": "test-user",
    "nickname": "测试用户"
  },
  ...
}
```

## 部署流程总结

完整的部署流程：

1. **构建 Go 应用**
   ```powershell
   $env:GOOS = "linux"
   $env:GOARCH = "amd64"
   go build -o main .
   ```

2. **创建部署包**
   ```powershell
   Compress-Archive -Path main -DestinationPath deploy.zip
   ```

3. **部署到 Azure**
   ```powershell
   Publish-AzWebApp -ResourceGroupName gomoku-rg -Name gomoku-api-go -ArchivePath deploy.zip
   ```

4. **配置运行时**
   ```powershell
   # 设置 linuxFxVersion = "GO|1.21"
   # 设置 appCommandLine = "./main"
   ```

5. **配置环境变量**
   ```powershell
   Set-AzWebApp -ResourceGroupName gomoku-rg -Name gomoku-api-go -AppSettings $settings
   ```

6. **重启应用**
   ```powershell
   Restart-AzWebApp -ResourceGroupName gomoku-rg -Name gomoku-api-go
   ```

## 后续建议

1. **启用日志记录**：配置 App Service 日志以便调试
2. **启用 AlwaysOn**：避免冷启动延迟（需要付费计划）
3. **配置健康检查**：在 Azure Portal 中配置 `/api/health` 为健康检查端点
4. **设置自动扩展**：根据负载自动扩展实例数
5. **配置 HTTPS Only**：强制使用 HTTPS

## 相关文档

- [AZURE_DEPLOY.md](./AZURE_DEPLOY.md) - 部署指南
- [MIGRATION_TO_GO.md](../migration/MIGRATION_TO_GO.md) - Go 迁移文档
- [Azure部署指南.md](./Azure部署指南.md) - 完整的 Azure 部署说明
