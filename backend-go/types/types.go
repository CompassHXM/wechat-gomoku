package types

import "time"

// Player 玩家信息
type Player struct {
	UserID   string `json:"userId"`
	Nickname string `json:"nickname"`
	Color    int    `json:"color"` // 1: 黑子, 2: 白子
	IsReady  bool   `json:"isReady"`
}

// Spectator 旁观者信息
type Spectator struct {
	UserID   string    `json:"userId"`
	Nickname string    `json:"nickname"`
	JoinTime time.Time `json:"joinTime"`
}

// Move 下棋记录
type Move struct {
	Row    int `json:"row"`
	Col    int `json:"col"`
	Player int `json:"player"`
}

// Creator 创建者信息
type Creator struct {
	UserID   string `json:"userId"`
	Nickname string `json:"nickname"`
}

// GameRoom 游戏房间
type GameRoom struct {
	ID             string      `json:"id"`
	RoomNumber     int         `json:"roomNumber"`
	Creator        Creator     `json:"creator"`
	Players        []Player    `json:"players"`
	Spectators     []Spectator `json:"spectators"`
	Board          [][]int     `json:"board"`
	CurrentPlayer  int         `json:"currentPlayer"`
	Status         string      `json:"status"` // waiting, playing, finished
	MoveHistory    []Move      `json:"moveHistory"`
	Winner         *string     `json:"winner"`
	CreateTime     time.Time   `json:"createTime"`
	UpdateTime     time.Time   `json:"updateTime"`
	LastActionTime time.Time   `json:"lastActionTime"`
}

// CreateRoomRequest 创建房间请求
type CreateRoomRequest struct {
	UserID   string `json:"userId" binding:"required"`
	Nickname string `json:"nickname" binding:"required"`
}

// JoinRoomRequest 加入房间请求
type JoinRoomRequest struct {
	UserID   string `json:"userId" binding:"required"`
	Nickname string `json:"nickname" binding:"required"`
	RoomID   string `json:"roomId" binding:"required"`
}

// MakeMoveRequest 下棋请求
type MakeMoveRequest struct {
	UserID string `json:"userId" binding:"required"`
	RoomID string `json:"roomId" binding:"required"`
	Row    int    `json:"row" binding:"required"`
	Col    int    `json:"col" binding:"required"`
}

// LeaveRoomRequest 离开房间请求
type LeaveRoomRequest struct {
	UserID string `json:"userId" binding:"required"`
	RoomID string `json:"roomId" binding:"required"`
}

// TokenRequest 获取令牌请求
type TokenRequest struct {
	UserID string `json:"userId" binding:"required"`
	RoomID string `json:"roomId"`
}

// PubSubMessage PubSub 消息
type PubSubMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
}
