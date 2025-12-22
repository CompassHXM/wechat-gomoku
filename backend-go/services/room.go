package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"time"

	"gomoku-backend/config"
	"gomoku-backend/types"

	"github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos"
	"github.com/google/uuid"
)

// CreateRoom 创建房间
func CreateRoom(ctx context.Context, req types.CreateRoomRequest) (*types.GameRoom, error) {
	// 检查用户是否已在其他房间
	existingRoom, err := FindRoomByUserID(ctx, req.UserID)
	if err == nil && existingRoom != nil {
		// 用户已在其他房间，先离开
		_ = LeaveRoom(ctx, types.LeaveRoomRequest{
			UserID: req.UserID,
			RoomID: existingRoom.ID,
		})
	}

	container := config.GetContainer()

	// 生成房间号
	roomNumber := 1000 + rand.Intn(9000)

	// 创建棋盘
	board := make([][]int, 15)
	for i := range board {
		board[i] = make([]int, 15)
	}

	now := time.Now()
	room := types.GameRoom{
		ID:         uuid.New().String(),
		RoomNumber: roomNumber,
		Creator: types.Creator{
			UserID:   req.UserID,
			Nickname: req.Nickname,
		},
		Players: []types.Player{
			{
				UserID:   req.UserID,
				Nickname: req.Nickname,
				Color:    1,
				IsReady:  true,
			},
		},
		Spectators:     []types.Spectator{},
		Board:          board,
		CurrentPlayer:  1,
		Status:         "waiting",
		MoveHistory:    []types.Move{},
		Winner:         nil,
		CreateTime:     now,
		UpdateTime:     now,
		LastActionTime: now,
	}

	// 序列化为 JSON
	roomJSON, err := json.Marshal(room)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal room: %w", err)
	}

	// 创建文档
	partitionKey := azcosmos.NewPartitionKeyString(room.Status)
	_, err = container.CreateItem(ctx, partitionKey, roomJSON, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create room: %w", err)
	}

	return &room, nil
}

// GetRooms 获取房间列表
func GetRooms(ctx context.Context) ([]types.GameRoom, error) {
	container := config.GetContainer()

	// Query each partition separately
	statuses := []string{"waiting", "playing"}
	var rooms []types.GameRoom

	for _, status := range statuses {
		// When querying within a partition, we don't need the status filter in the query
		query := "SELECT * FROM c ORDER BY c.createTime DESC"
		partitionKey := azcosmos.NewPartitionKeyString(status)
		queryPager := container.NewQueryItemsPager(query, partitionKey, nil)

		for queryPager.More() {
			response, err := queryPager.NextPage(ctx)
			if err != nil {
				log.Printf("Failed to query rooms for status %s: %v", status, err)
				continue
			}

			for _, item := range response.Items {
				var room types.GameRoom
				if err := json.Unmarshal(item, &room); err != nil {
					log.Printf("Failed to unmarshal room: %v", err)
					continue
				}
				rooms = append(rooms, room)
			}
		}
	}

	return rooms, nil
}

// GetRoom 获取单个房间
func GetRoom(ctx context.Context, roomID string) (*types.GameRoom, error) {
	container := config.GetContainer()

	// Query each partition separately
	statuses := []string{"waiting", "playing", "finished"}
	for _, status := range statuses {
		query := "SELECT * FROM c WHERE c.id = @id"
		partitionKey := azcosmos.NewPartitionKeyString(status)
		queryPager := container.NewQueryItemsPager(query, partitionKey, &azcosmos.QueryOptions{
			QueryParameters: []azcosmos.QueryParameter{
				{Name: "@id", Value: roomID},
			},
		})

		for queryPager.More() {
			response, err := queryPager.NextPage(ctx)
			if err != nil {
				log.Printf("Failed to query room in status %s: %v", status, err)
				continue
			}

			if len(response.Items) > 0 {
				var room types.GameRoom
				if err := json.Unmarshal(response.Items[0], &room); err != nil {
					return nil, fmt.Errorf("failed to unmarshal room: %w", err)
				}
				return &room, nil
			}
		}
	}

	return nil, fmt.Errorf("room not found")
}

// FindRoomByUserID 根据用户ID查找房间
func FindRoomByUserID(ctx context.Context, userID string) (*types.GameRoom, error) {
	container := config.GetContainer()

	// Query each partition separately
	statuses := []string{"waiting", "playing", "finished"}
	for _, status := range statuses {
		query := `SELECT * FROM c 
			WHERE EXISTS(SELECT VALUE p FROM p IN c.players WHERE p.userId = @userId) 
			OR EXISTS(SELECT VALUE s FROM s IN c.spectators WHERE s.userId = @userId)`

		partitionKey := azcosmos.NewPartitionKeyString(status)
		queryPager := container.NewQueryItemsPager(query, partitionKey, &azcosmos.QueryOptions{
			QueryParameters: []azcosmos.QueryParameter{
				{Name: "@userId", Value: userID},
			},
		})

		for queryPager.More() {
			response, err := queryPager.NextPage(ctx)
			if err != nil {
				log.Printf("Failed to find room by user in status %s: %v", status, err)
				continue
			}

			if len(response.Items) > 0 {
				var room types.GameRoom
				if err := json.Unmarshal(response.Items[0], &room); err != nil {
					return nil, fmt.Errorf("failed to unmarshal room: %w", err)
				}
				return &room, nil
			}
		}
	}

	return nil, nil
}
