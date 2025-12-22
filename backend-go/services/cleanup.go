package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"gomoku-backend/config"
	"gomoku-backend/types"

	"github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos"
)

// LeaveRoom 离开房间
func LeaveRoom(ctx context.Context, req types.LeaveRoomRequest) error {
	room, err := GetRoom(ctx, req.RoomID)
	if err != nil {
		// 尝试通过 userId 查找
		room, err = FindRoomByUserID(ctx, req.UserID)
		if err != nil || room == nil {
			return nil // 房间不存在或用户不在房间
		}
	}

	// 检查用户是否在房间
	playerIndex := -1
	spectatorIndex := -1

	for i, p := range room.Players {
		if p.UserID == req.UserID {
			playerIndex = i
			break
		}
	}

	if playerIndex == -1 {
		for i, s := range room.Spectators {
			if s.UserID == req.UserID {
				spectatorIndex = i
				break
			}
		}
	}

	if playerIndex == -1 && spectatorIndex == -1 {
		return nil // 用户不在房间
	}

	oldStatus := room.Status
	shouldDelete := false

	// 移除用户
	if playerIndex != -1 {
		room.Players = append(room.Players[:playerIndex], room.Players[playerIndex+1:]...)
	} else if spectatorIndex != -1 {
		room.Spectators = append(room.Spectators[:spectatorIndex], room.Spectators[spectatorIndex+1:]...)
	}

	// 从 PubSub 组移除
	_ = config.RemoveUserFromRoom(ctx, req.UserID, room.ID)

	// 检查是否需要删除房间
	if len(room.Players) == 0 {
		shouldDelete = true
	}

	container := config.GetContainer()

	if shouldDelete {
		// 踢出所有旁观者
		for _, spectator := range room.Spectators {
			_ = config.RemoveUserFromRoom(ctx, spectator.UserID, room.ID)
		}

		// 通知房间即将销毁
		_ = config.SendToRoom(ctx, room.ID, types.PubSubMessage{
			Type: "room_deleted",
			Data: map[string]string{"roomId": room.ID},
		})

		// 删除房间
		partitionKey := azcosmos.NewPartitionKeyString(oldStatus)
		_, _ = container.DeleteItem(ctx, partitionKey, room.ID, nil)
	} else {
		// 如果玩家离开导致状态变化
		if room.Status == "playing" && len(room.Players) < 2 {
			room.Status = "waiting"
			// 重置游戏盘面
			board := make([][]int, 15)
			for i := range board {
				board[i] = make([]int, 15)
			}
			room.Board = board
			room.MoveHistory = []types.Move{}
			room.CurrentPlayer = 1
			room.Winner = nil
			// 剩下的玩家重置
			if len(room.Players) > 0 {
				room.Players[0].Color = 1
				room.Players[0].IsReady = true
			}
		}

		room.LastActionTime = time.Now()
		room.UpdateTime = time.Now()

		if oldStatus != room.Status {
			// 状态改变，删除旧文档并创建新文档
			partitionKeyOld := azcosmos.NewPartitionKeyString(oldStatus)
			_, _ = container.DeleteItem(ctx, partitionKeyOld, room.ID, nil)

			roomJSON, _ := json.Marshal(room)
			partitionKeyNew := azcosmos.NewPartitionKeyString(room.Status)
			_, _ = container.CreateItem(ctx, partitionKeyNew, roomJSON, nil)
		} else {
			// 状态未变，直接替换
			roomJSON, _ := json.Marshal(room)
			partitionKey := azcosmos.NewPartitionKeyString(room.Status)
			_, _ = container.ReplaceItem(ctx, partitionKey, room.ID, roomJSON, nil)
		}

		// 通知更新
		_ = config.SendToRoom(ctx, room.ID, types.PubSubMessage{
			Type: "room_update",
			Data: room,
		})
	}

	return nil
}

// CheckInactiveRooms 清理不活跃房间
func CheckInactiveRooms(ctx context.Context) error {
	container := config.GetContainer()
	tenMinutesAgo := time.Now().Add(-10 * time.Minute).Format(time.RFC3339)

	query := "SELECT * FROM c WHERE c.lastActionTime < @threshold"
	queryPager := container.NewQueryItemsPager(query, azcosmos.PartitionKey{}, &azcosmos.QueryOptions{
		QueryParameters: []azcosmos.QueryParameter{
			{Name: "@threshold", Value: tenMinutesAgo},
		},
	})

	var inactiveRooms []types.GameRoom

	for queryPager.More() {
		response, err := queryPager.NextPage(ctx)
		if err != nil {
			return fmt.Errorf("failed to query inactive rooms: %w", err)
		}

		for _, item := range response.Items {
			var room types.GameRoom
			if err := json.Unmarshal(item, &room); err != nil {
				log.Printf("Failed to unmarshal room: %v", err)
				continue
			}
			inactiveRooms = append(inactiveRooms, room)
		}
	}

	if len(inactiveRooms) > 0 {
		log.Printf("Found %d inactive rooms to clean up.", len(inactiveRooms))
	}

	for _, room := range inactiveRooms {
		log.Printf("Cleaning up inactive room: %s", room.ID)

		// 通知房间内所有用户
		_ = config.SendToRoom(ctx, room.ID, types.PubSubMessage{
			Type: "room_deleted",
			Data: map[string]interface{}{
				"roomId": room.ID,
				"reason": "inactivity",
			},
		})

		// 删除房间
		partitionKey := azcosmos.NewPartitionKeyString(room.Status)
		_, _ = container.DeleteItem(ctx, partitionKey, room.ID, nil)
	}

	return nil
}
