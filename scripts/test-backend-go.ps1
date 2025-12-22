# 测试 Go 后端
# 需要先配置 .env 文件

Write-Host "Testing Gomoku Backend (Go Version)" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

$baseUrl = "http://localhost:3000"

# 1. 健康检查
Write-Host "`n1. Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
    Write-Host "✓ Health check passed: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
    exit 1
}

# 2. 创建房间
Write-Host "`n2. Creating room..." -ForegroundColor Yellow
$createRoomBody = @{
    userId = "test-user-1"
    nickname = "Player1"
} | ConvertTo-Json

try {
    $room = Invoke-RestMethod -Uri "$baseUrl/api/rooms/create" -Method Post -Body $createRoomBody -ContentType "application/json"
    Write-Host "✓ Room created: $($room.roomNumber)" -ForegroundColor Green
    $roomId = $room.id
} catch {
    Write-Host "✗ Failed to create room: $_" -ForegroundColor Red
    exit 1
}

# 3. 获取房间列表
Write-Host "`n3. Getting room list..." -ForegroundColor Yellow
try {
    $rooms = Invoke-RestMethod -Uri "$baseUrl/api/rooms" -Method Get
    Write-Host "✓ Found $($rooms.Count) room(s)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to get rooms: $_" -ForegroundColor Red
}

# 4. 获取单个房间
Write-Host "`n4. Getting room details..." -ForegroundColor Yellow
try {
    $roomDetail = Invoke-RestMethod -Uri "$baseUrl/api/rooms/$roomId" -Method Get
    Write-Host "✓ Room status: $($roomDetail.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to get room: $_" -ForegroundColor Red
}

# 5. 加入房间
Write-Host "`n5. Joining room..." -ForegroundColor Yellow
$joinRoomBody = @{
    userId = "test-user-2"
    nickname = "Player2"
    roomId = $roomId
} | ConvertTo-Json

try {
    $joinedRoom = Invoke-RestMethod -Uri "$baseUrl/api/rooms/join" -Method Post -Body $joinRoomBody -ContentType "application/json"
    Write-Host "✓ Joined room, status: $($joinedRoom.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to join room: $_" -ForegroundColor Red
}

# 6. 下棋
Write-Host "`n6. Making a move..." -ForegroundColor Yellow
$moveBody = @{
    userId = "test-user-1"
    roomId = $roomId
    row = 7
    col = 7
} | ConvertTo-Json

try {
    $movedRoom = Invoke-RestMethod -Uri "$baseUrl/api/rooms/move" -Method Post -Body $moveBody -ContentType "application/json"
    Write-Host "✓ Move successful, current player: $($movedRoom.currentPlayer)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to make move: $_" -ForegroundColor Red
}

# 7. 获取访问令牌
Write-Host "`n7. Getting access token..." -ForegroundColor Yellow
$tokenBody = @{
    userId = "test-user-1"
    roomId = $roomId
} | ConvertTo-Json

try {
    $token = Invoke-RestMethod -Uri "$baseUrl/api/auth/token" -Method Post -Body $tokenBody -ContentType "application/json"
    Write-Host "✓ Token obtained successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to get token: $_" -ForegroundColor Red
}

# 8. 离开房间
Write-Host "`n8. Leaving room..." -ForegroundColor Yellow
$leaveBody = @{
    userId = "test-user-2"
    roomId = $roomId
} | ConvertTo-Json

try {
    $leaveResult = Invoke-RestMethod -Uri "$baseUrl/api/rooms/leave" -Method Post -Body $leaveBody -ContentType "application/json"
    Write-Host "✓ Left room successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to leave room: $_" -ForegroundColor Red
}

Write-Host "`n=====================================" -ForegroundColor Green
Write-Host "All tests completed!" -ForegroundColor Green
