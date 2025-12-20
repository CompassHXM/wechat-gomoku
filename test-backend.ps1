# test-backend.ps1
param (
    [string]$BaseUrl
)

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
    Write-Host "请输入您的后端 URL (例如 https://gomoku-backend.azurewebsites.net):" -ForegroundColor Yellow
    $BaseUrl = Read-Host
}

# 移除末尾的斜杠
if ($BaseUrl.EndsWith("/")) {
    $BaseUrl = $BaseUrl.Substring(0, $BaseUrl.Length - 1)
}

Write-Host "`n=== 开始测试后端服务: $BaseUrl ===`n" -ForegroundColor Cyan

# 0. 测试根路径 (验证服务器是否启动)
Write-Host "0. 测试 GET / (服务器状态)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/" -Method Get -ErrorAction Stop
    Write-Host " [成功]" -ForegroundColor Green
    Write-Host "   响应: $response" -ForegroundColor Gray
}
catch {
    Write-Host " [失败]" -ForegroundColor Red
    Write-Host "   错误: $_" -ForegroundColor Red
    # 不退出，继续尝试
}

# 0.5 测试健康检查 API
Write-Host "`n0.5. 测试 GET /api/health (API路由状态)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get -ErrorAction Stop
    Write-Host " [成功]" -ForegroundColor Green
    Write-Host "   状态: $($response.status)" -ForegroundColor Gray
}
catch {
    Write-Host " [失败]" -ForegroundColor Red
    Write-Host "   错误: $_" -ForegroundColor Red
}

# 1. 测试获取房间列表 (验证数据库读取)
$UserId = "test-user-" + (Get-Random -Minimum 1000 -Maximum 9999)
$Nickname = "Tester"

# 1. 测试获取房间列表 (验证数据库读取)
Write-Host "1. 测试 GET /api/rooms (数据库读取)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/rooms" -Method Get -ErrorAction Stop
    Write-Host " [成功]" -ForegroundColor Green
    Write-Host "   当前房间数量: $($response.Count)" -ForegroundColor Gray
}
catch {
    Write-Host " [失败]" -ForegroundColor Red
    Write-Host "   错误: $_" -ForegroundColor Red
    exit
}

# 2. 测试创建房间 (验证数据库写入)
Write-Host "`n2. 测试 POST /api/rooms/create (数据库写入)..." -NoNewline
try {
    $body = @{
        userId = $UserId
        nickname = $Nickname
    } | ConvertTo-Json

    $room = Invoke-RestMethod -Uri "$BaseUrl/api/rooms/create" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host " [成功]" -ForegroundColor Green
    Write-Host "   创建房间ID: $($room.id)" -ForegroundColor Gray
    $RoomId = $room.id
}
catch {
    Write-Host " [失败]" -ForegroundColor Red
    Write-Host "   错误: $_" -ForegroundColor Red
    exit
}

# 3. 测试获取 PubSub Token (验证 PubSub 连接)
Write-Host "`n3. 测试 POST /api/auth/token (PubSub 连接)..." -NoNewline
try {
    $body = @{
        userId = $UserId
        roomId = $RoomId
    } | ConvertTo-Json

    $token = Invoke-RestMethod -Uri "$BaseUrl/api/auth/token" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    
    if ($token.url) {
        Write-Host " [成功]" -ForegroundColor Green
        Write-Host "   获取到 PubSub 连接 URL" -ForegroundColor Gray
    } else {
        throw "未返回 URL"
    }
}
catch {
    Write-Host " [失败]" -ForegroundColor Red
    Write-Host "   错误: $_" -ForegroundColor Red
    Write-Host "   提示: 请检查 Azure App Service 的环境变量 PUBSUB_CONNECTION_STRING 是否正确配置" -ForegroundColor Yellow
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Cyan
