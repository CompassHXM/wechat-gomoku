# Azure 部署脚本 - Go 后端版本
# 使用 Azure PowerShell 部署五子棋游戏 Go 后端到 Azure App Service

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "gomoku-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$AppName = "gomoku-api-go",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastasia",
    
    [Parameter(Mandatory=$false)]
    [string]$PlanName = "gomoku-plan-go",
    
    [Parameter(Mandatory=$false)]
    [switch]$ConfigureEnv = $false
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "Azure App Service 部署脚本 - Go 后端" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 检查是否已登录
Write-Host "检查 Azure 登录状态..." -ForegroundColor Yellow
$context = Get-AzContext
if (-not $context) {
    Write-Host "未登录 Azure，正在登录..." -ForegroundColor Yellow
    Connect-AzAccount
} else {
    Write-Host "✓ 已登录 Azure: $($context.Account.Id)" -ForegroundColor Green
}

# 检查资源组是否存在
Write-Host "`n检查资源组..." -ForegroundColor Yellow
$rg = Get-AzResourceGroup -Name $ResourceGroupName -ErrorAction SilentlyContinue
if (-not $rg) {
    Write-Host "资源组不存在，正在创建..." -ForegroundColor Yellow
    New-AzResourceGroup -Name $ResourceGroupName -Location $Location
    Write-Host "✓ 资源组创建成功" -ForegroundColor Green
} else {
    Write-Host "✓ 资源组已存在" -ForegroundColor Green
}

# 检查 App Service Plan 是否存在
Write-Host "`n检查 App Service Plan..." -ForegroundColor Yellow
$plan = Get-AzAppServicePlan -ResourceGroupName $ResourceGroupName -Name $PlanName -ErrorAction SilentlyContinue
if (-not $plan) {
    Write-Host "App Service Plan 不存在，正在创建 (免费层)..." -ForegroundColor Yellow
    New-AzAppServicePlan `
        -Name $PlanName `
        -ResourceGroupName $ResourceGroupName `
        -Location $Location `
        -Linux `
        -Tier Free
    Write-Host "✓ App Service Plan 创建成功" -ForegroundColor Green
} else {
    Write-Host "✓ App Service Plan 已存在" -ForegroundColor Green
}

# 检查 Web App 是否存在
Write-Host "`n检查 Web App..." -ForegroundColor Yellow
$webapp = Get-AzWebApp -ResourceGroupName $ResourceGroupName -Name $AppName -ErrorAction SilentlyContinue
if (-not $webapp) {
    Write-Host "Web App 不存在，正在创建..." -ForegroundColor Yellow
    New-AzWebApp `
        -ResourceGroupName $ResourceGroupName `
        -Name $AppName `
        -Location $Location `
        -AppServicePlan $PlanName
    
    Write-Host "配置 Go 1.21 运行时..." -ForegroundColor Yellow
    # 使用 Azure Resource API 配置运行时
    $resource = Get-AzResource -ResourceGroupName $ResourceGroupName -ResourceName "$AppName/web" -ResourceType Microsoft.Web/sites/config -ApiVersion 2022-03-01
    $properties = $resource.Properties
    $properties.linuxFxVersion = "GO|1.21"
    Set-AzResource -ResourceId $resource.ResourceId -Properties $properties -ApiVersion 2022-03-01 -Force | Out-Null
    
    Write-Host "✓ Web App 创建成功" -ForegroundColor Green
    Write-Host "  URL: https://$AppName.azurewebsites.net" -ForegroundColor Cyan
} else {
    Write-Host "✓ Web App 已存在" -ForegroundColor Green
    Write-Host "  URL: https://$AppName.azurewebsites.net" -ForegroundColor Cyan
    
    # 确保运行时正确配置
    Write-Host "验证 Go 运行时配置..." -ForegroundColor Yellow
    $resource = Get-AzResource -ResourceGroupName $ResourceGroupName -ResourceName "$AppName/web" -ResourceType Microsoft.Web/sites/config -ApiVersion 2022-03-01
    if ($resource.Properties.linuxFxVersion -ne "GO|1.21") {
        Write-Host "  更新运行时配置..." -ForegroundColor Yellow
        $properties = $resource.Properties
        $properties.linuxFxVersion = "GO|1.21"
        Set-AzResource -ResourceId $resource.ResourceId -Properties $properties -ApiVersion 2022-03-01 -Force | Out-Null
        Write-Host "  ✓ 运行时已更新" -ForegroundColor Green
    } else {
        Write-Host "  ✓ 运行时配置正确" -ForegroundColor Green
    }
}

# 构建 Go 应用
Write-Host "`n构建 Go 应用..." -ForegroundColor Yellow
$originalLocation = Get-Location
# 脚本已经在 backend-go 目录中，不需要切换

Write-Host "设置环境变量..." -ForegroundColor Yellow
$env:GOOS = "linux"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "0"

Write-Host "执行 go build..." -ForegroundColor Yellow
go build -o main .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 构建成功" -ForegroundColor Green
} else {
    Write-Host "✗ 构建失败" -ForegroundColor Red
    Set-Location $originalLocation
    exit 1
}

# 创建部署包
Write-Host "`n创建部署包..." -ForegroundColor Yellow
$deployZipPath = Join-Path $originalLocation "deploy.zip"
if (Test-Path $deployZipPath) {
    Remove-Item $deployZipPath -Force
}
Compress-Archive -Path main -DestinationPath $deployZipPath -Force
Write-Host "✓ 部署包创建成功" -ForegroundColor Green

# 部署到 Azure
Write-Host "`n部署到 Azure..." -ForegroundColor Yellow
Publish-AzWebApp `
    -ResourceGroupName $ResourceGroupName `
    -Name $AppName `
    -ArchivePath $deployZipPath `
    -Force

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 部署成功" -ForegroundColor Green
} else {
    Write-Host "✗ 部署失败" -ForegroundColor Red
    Set-Location $originalLocation
    exit 1
}

# 清理
Write-Host "`n清理临时文件..." -ForegroundColor Yellow
Remove-Item "main" -Force -ErrorAction SilentlyContinue
Remove-Item $deployZipPath -Force -ErrorAction SilentlyContinue
Write-Host "✓ 清理完成" -ForegroundColor Green

Set-Location $originalLocation

# 配置环境变量
if ($ConfigureEnv) {
    Write-Host "`n配置环境变量..." -ForegroundColor Yellow
    
    $envFile = Join-Path $originalLocation ".env"
    if (Test-Path $envFile) {
        Write-Host "从 .env 文件读取配置..." -ForegroundColor Yellow
        
        # 读取 .env 文件并解析
        $settings = @{}
        Get-Content $envFile | ForEach-Object {
            $line = $_.Trim()
            # 跳过注释和空行
            if ($line -and -not $line.StartsWith("#")) {
                $parts = $line -split "=", 2
                if ($parts.Length -eq 2) {
                    $key = $parts[0].Trim()
                    $value = $parts[1].Trim()
                    $settings[$key] = $value
                }
            }
        }
        
        if ($settings.Count -gt 0) {
            Write-Host "正在应用环境变量到 Azure Web App..." -ForegroundColor Yellow
            
            try {
                Set-AzWebApp `
                    -ResourceGroupName $ResourceGroupName `
                    -Name $AppName `
                    -AppSettings $settings
                
                Write-Host "✓ 环境变量配置成功" -ForegroundColor Green
                Write-Host "  配置了 $($settings.Count) 个环境变量" -ForegroundColor Cyan
            }
            catch {
                Write-Host "✗ 环境变量配置失败: $_" -ForegroundColor Red
            }
        }
        else {
            Write-Host "⚠ .env 文件为空或格式不正确" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "⚠ 未找到 .env 文件: $envFile" -ForegroundColor Yellow
        Write-Host "  请先创建 .env 文件（可以从 .env.example 复制）" -ForegroundColor Yellow
    }
    
    # 配置启动命令
    Write-Host "`n配置启动命令..." -ForegroundColor Yellow
    try {
        $resource = Get-AzResource -ResourceGroupName $ResourceGroupName -ResourceName "$AppName/web" -ResourceType Microsoft.Web/sites/config -ApiVersion 2022-03-01
        $properties = $resource.Properties
        $properties.appCommandLine = "./main"
        Set-AzResource -ResourceId $resource.ResourceId -Properties $properties -ApiVersion 2022-03-01 -Force | Out-Null
        Write-Host "✓ 启动命令配置成功" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ 启动命令配置失败: $_" -ForegroundColor Red
    }
}

# 配置环境变量提醒
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

if (-not $ConfigureEnv) {
    Write-Host "⚠ 环境变量尚未配置" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "选项 1：重新运行脚本并自动配置（推荐）" -ForegroundColor White
    Write-Host "  1. 确保 backend-go/.env 文件存在且包含正确配置" -ForegroundColor Cyan
    Write-Host "  2. 运行: .\deploy-azure.ps1 -ConfigureEnv" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "选项 2：手动配置" -ForegroundColor White
    Write-Host "  在 Azure Portal 中配置以下环境变量：" -ForegroundColor Cyan
    Write-Host "  - COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE, COSMOS_CONTAINER" -ForegroundColor Cyan
    Write-Host "  - PUBSUB_CONNECTION_STRING, PUBSUB_HUB_NAME" -ForegroundColor Cyan
    Write-Host "  - PORT=8080, NODE_ENV=production" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "选项 3：使用 PowerShell 命令配置" -ForegroundColor White
    Write-Host @"
  `$settings = @{
      COSMOS_ENDPOINT="https://your-account.documents.azure.com:443/"
      COSMOS_KEY="your-cosmos-key"
      COSMOS_DATABASE="gomoku"
      COSMOS_CONTAINER="game_rooms"
      PUBSUB_CONNECTION_STRING="your-pubsub-connection-string"
      PUBSUB_HUB_NAME="gomoku"
      PORT="8080"
      NODE_ENV="production"
      ALLOWED_ORIGINS="https://servicewechat.com"
  }
  
  Set-AzWebApp ``
    -ResourceGroupName $ResourceGroupName ``
    -Name $AppName ``
    -AppSettings `$settings
"@ -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "验证部署：" -ForegroundColor White
Write-Host "  访问: https://$AppName.azurewebsites.net/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "查看日志：" -ForegroundColor White
Write-Host "  Get-AzWebAppLog -ResourceGroupName $ResourceGroupName -Name $AppName -Tail" -ForegroundColor Cyan
