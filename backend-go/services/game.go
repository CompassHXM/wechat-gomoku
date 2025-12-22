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

// JoinRoom 加入房间
func JoinRoom(ctx context.Context, req types.JoinRoomRequest) (*types.GameRoom, error) {
	// 检查用户是否已在其他房间
	existingRoom, err := FindRoomByUserID(ctx, req.UserID)
	if err == nil && existingRoom != nil && existingRoom.ID != req.RoomID {
		// 用户在其他房间，先离开
		_ = LeaveRoom(ctx, types.LeaveRoomRequest{
			UserID: req.UserID,
			RoomID: existingRoom.ID,
		})
	}

	room, err := GetRoom(ctx, req.RoomID)
	if err != nil {
		return nil, err
	}

	// 检查用户是否已在房间中
	alreadyInRoom := false
	for _, p := range room.Players {
		if p.UserID == req.UserID {
			alreadyInRoom = true
			break
		}
	}
	if !alreadyInRoom {
		for _, s := range room.Spectators {
			if s.UserID == req.UserID {
				alreadyInRoom = true
				break
			}
		}
	}

	if alreadyInRoom {
		return room, nil
	}

	oldStatus := room.Status

	if len(room.Players) >= 2 {
		// 加入为旁观者
		room.Spectators = append(room.Spectators, types.Spectator{
			UserID:   req.UserID,
			Nickname: req.Nickname,
			JoinTime: time.Now(),
		})
	} else {
		// 加入为玩家
		room.Players = append(room.Players, types.Player{
			UserID:   req.UserID,
			Nickname: req.Nickname,
			Color:    2,
			IsReady:  true,
		})

		// 两个玩家都加入后开始游戏
		if len(room.Players) == 2 {
			room.Status = "playing"
		}
	}

	room.UpdateTime = time.Now()
	room.LastActionTime = time.Now()

	// 更新数据库
	container := config.GetContainer()
	if oldStatus != room.Status {
		// 状态改变，删除旧文档并创建新文档
		partitionKeyOld := azcosmos.NewPartitionKeyString(oldStatus)
		_, _ = container.DeleteItem(ctx, partitionKeyOld, room.ID, nil)

		roomJSON, _ := json.Marshal(room)
		partitionKeyNew := azcosmos.NewPartitionKeyString(room.Status)
		_, err = container.CreateItem(ctx, partitionKeyNew, roomJSON, nil)
	} else {
		// 状态未变，直接替换
		roomJSON, _ := json.Marshal(room)
		partitionKey := azcosmos.NewPartitionKeyString(room.Status)
		_, err = container.ReplaceItem(ctx, partitionKey, room.ID, roomJSON, nil)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to update room: %w", err)
	}

	// 通知房间内所有用户
	_ = config.SendToRoom(ctx, req.RoomID, types.PubSubMessage{
		Type: "room_update",
		Data: room,
	})

	return room, nil
}

// MakeMove 下棋
func MakeMove(ctx context.Context, req types.MakeMoveRequest) (*types.GameRoom, error) {
	room, err := GetRoom(ctx, req.RoomID)
	if err != nil {
		return nil, err
	}

	if room.Status != "playing" {
		return nil, fmt.Errorf("game is not in playing status")
	}

	oldStatus := room.Status

	// 验证是否是当前玩家
	var currentPlayerObj *types.Player
	for i := range room.Players {
		if room.Players[i].Color == room.CurrentPlayer {
			currentPlayerObj = &room.Players[i]
			break
		}
	}

	if currentPlayerObj == nil || currentPlayerObj.UserID != req.UserID {
		return nil, fmt.Errorf("not your turn")
	}

	// 验证位置是否为空
	if room.Board[req.Row][req.Col] != 0 {
		return nil, fmt.Errorf("position already occupied")
	}

	// 放置棋子
	room.Board[req.Row][req.Col] = room.CurrentPlayer
	room.MoveHistory = append(room.MoveHistory, types.Move{
		Row:    req.Row,
		Col:    req.Col,
		Player: room.CurrentPlayer,
	})

	// 检查是否获胜
	hasWon := checkWin(room.Board, req.Row, req.Col)
	isDraw := !hasWon && checkDraw(room.Board)

	if hasWon {
		room.Status = "finished"
		winner := currentPlayerObj.Nickname
		room.Winner = &winner
	} else if isDraw {
		room.Status = "finished"
		draw := "平局"
		room.Winner = &draw
	} else {
		// 切换玩家
		if room.CurrentPlayer == 1 {
			room.CurrentPlayer = 2
		} else {
			room.CurrentPlayer = 1
		}
	}

	room.LastActionTime = time.Now()
	room.UpdateTime = time.Now()

	// 更新数据库
	container := config.GetContainer()
	if oldStatus != room.Status {
		// 状态改变，删除旧文档并创建新文档
		partitionKeyOld := azcosmos.NewPartitionKeyString(oldStatus)
		_, _ = container.DeleteItem(ctx, partitionKeyOld, room.ID, nil)

		roomJSON, _ := json.Marshal(room)
		partitionKeyNew := azcosmos.NewPartitionKeyString(room.Status)
		_, err = container.CreateItem(ctx, partitionKeyNew, roomJSON, nil)
	} else {
		// 状态未变，直接替换
		roomJSON, _ := json.Marshal(room)
		partitionKey := azcosmos.NewPartitionKeyString(room.Status)
		_, err = container.ReplaceItem(ctx, partitionKey, room.ID, roomJSON, nil)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to update room: %w", err)
	}

	log.Printf("Sending game update to room %s for move at %d,%d", req.RoomID, req.Row, req.Col)

	// 通知房间内所有用户
	_ = config.SendToRoom(ctx, req.RoomID, types.PubSubMessage{
		Type: "game_update",
		Data: room,
	})

	return room, nil
}

// checkWin 检查获胜
func checkWin(board [][]int, row, col int) bool {
	player := board[row][col]
	directions := [][][]int{
		{{0, 1}, {0, -1}},  // 水平
		{{1, 0}, {-1, 0}},  // 垂直
		{{1, 1}, {-1, -1}}, // 主对角线
		{{1, -1}, {-1, 1}}, // 副对角线
	}

	for _, dirs := range directions {
		count := 1

		// 检查第一个方向
		for i := 1; i < 5; i++ {
			newRow := row + dirs[0][0]*i
			newCol := col + dirs[0][1]*i
			if newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && board[newRow][newCol] == player {
				count++
			} else {
				break
			}
		}

		// 检查第二个方向
		for i := 1; i < 5; i++ {
			newRow := row + dirs[1][0]*i
			newCol := col + dirs[1][1]*i
			if newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && board[newRow][newCol] == player {
				count++
			} else {
				break
			}
		}

		if count >= 5 {
			return true
		}
	}

	return false
}

// checkDraw 检查平局
func checkDraw(board [][]int) bool {
	for i := 0; i < 15; i++ {
		for j := 0; j < 15; j++ {
			if board[i][j] == 0 {
				return false
			}
		}
	}
	return true
}
