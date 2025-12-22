package routes

import (
	"context"
	"log"

	"gomoku-backend/config"
	"gomoku-backend/services"
	"gomoku-backend/types"

	"github.com/gin-gonic/gin"
)

// RegisterRoutes 注册所有路由
func RegisterRoutes(router *gin.Engine) {
	api := router.Group("/api")

	// 获取 PubSub 连接令牌
	api.POST("/auth/token", getToken)

	// 房间相关路由
	api.POST("/rooms/create", createRoom)
	api.GET("/rooms", getRooms)
	api.GET("/rooms/:roomId", getRoom)
	api.POST("/rooms/join", joinRoom)
	api.POST("/rooms/move", makeMove)
	api.POST("/rooms/leave", leaveRoom)

	// Web PubSub 事件处理
	api.OPTIONS("/webpubsub/event", handleWebPubSubOptions)
	api.POST("/webpubsub/event", handleWebPubSubEvent)

	// 健康检查
	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "ok",
			"timestamp": c.GetTime("timestamp"),
		})
	})
}

// getToken 获取客户端访问令牌
func getToken(c *gin.Context) {
	var req types.TokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()
	token, err := config.GetClientAccessToken(ctx, req.UserID, req.RoomID)
	if err != nil {
		log.Printf("Error getting token: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, token)
}

// createRoom 创建房间
func createRoom(c *gin.Context) {
	var req types.CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()
	room, err := services.CreateRoom(ctx, req)
	if err != nil {
		log.Printf("Error creating room: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, room)
}

// getRooms 获取房间列表
func getRooms(c *gin.Context) {
	ctx := context.Background()
	rooms, err := services.GetRooms(ctx)
	if err != nil {
		log.Printf("Error getting rooms: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, rooms)
}

// getRoom 获取单个房间
func getRoom(c *gin.Context) {
	roomID := c.Param("roomId")

	ctx := context.Background()
	room, err := services.GetRoom(ctx, roomID)
	if err != nil {
		log.Printf("Error getting room: %v", err)
		c.JSON(404, gin.H{"error": "Room not found"})
		return
	}

	c.JSON(200, room)
}

// joinRoom 加入房间
func joinRoom(c *gin.Context) {
	var req types.JoinRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()
	room, err := services.JoinRoom(ctx, req)
	if err != nil {
		log.Printf("Error joining room: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, room)
}

// makeMove 下棋
func makeMove(c *gin.Context) {
	var req types.MakeMoveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()
	room, err := services.MakeMove(ctx, req)
	if err != nil {
		log.Printf("Error making move: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, room)
}

// leaveRoom 离开房间
func leaveRoom(c *gin.Context) {
	var req types.LeaveRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()
	err := services.LeaveRoom(ctx, req)
	if err != nil {
		log.Printf("Error leaving room: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"success": true})
}

// handleWebPubSubOptions 处理 Web PubSub OPTIONS 请求
func handleWebPubSubOptions(c *gin.Context) {
	if origin := c.GetHeader("webhook-request-origin"); origin != "" {
		c.Header("Webhook-Allowed-Origin", "*")
	}
	c.Status(200)
}

// handleWebPubSubEvent 处理 Web PubSub 事件
func handleWebPubSubEvent(c *gin.Context) {
	// 处理 CloudEvents 握手验证
	if origin := c.GetHeader("webhook-request-origin"); origin != "" {
		c.Header("Webhook-Allowed-Origin", "*")
		c.Status(200)
		return
	}

	eventType := c.GetHeader("ce-type")
	userID := c.GetHeader("ce-userid")
	connectionID := c.GetHeader("ce-connectionid")

	log.Printf("[WebPubSub] Event: %s, User: %s, Connection: %s", eventType, userID, connectionID)

	if eventType == "azure.webpubsub.sys.connect" {
		c.Status(200)
		return
	}

	ctx := context.Background()

	if eventType == "azure.webpubsub.sys.disconnected" {
		log.Printf("User disconnected: %s", userID)
		if userID != "" {
			// 查找用户所在的房间并移除
			room, err := services.FindRoomByUserID(ctx, userID)
			if err == nil && room != nil {
				_ = services.LeaveRoom(ctx, types.LeaveRoomRequest{
					UserID: userID,
					RoomID: room.ID,
				})
			}
		}
	} else if eventType == "azure.webpubsub.user.message" {
		// 处理用户消息
		var message map[string]interface{}
		if err := c.ShouldBindJSON(&message); err == nil {
			log.Printf("Received message from %s: %v", userID, message)

			if msgType, ok := message["type"].(string); ok && msgType == "joinGroup" {
				if group, ok := message["group"].(string); ok {
					_ = config.AddUserToRoom(ctx, userID, group)
					log.Printf("Added user %s to group %s via message", userID, group)
				}
			}
		}
	}

	c.Status(200)
}
