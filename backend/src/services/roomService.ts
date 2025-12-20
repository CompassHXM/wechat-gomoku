// roomService.ts - 房间管理服务
import { getContainer } from '../config/database';
import { sendToRoom, removeUserFromRoom } from '../config/pubsub';
import { GameRoom, CreateRoomRequest, JoinRoomRequest, MakeMoveRequest, Move, LeaveRoomRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

// 创建房间
export async function createRoom(request: CreateRoomRequest): Promise<GameRoom> {
  // 检查用户是否已在其他房间
  const existingRoom = await findRoomByUserId(request.userId);
  if (existingRoom) {
    await leaveRoom({ userId: request.userId, roomId: existingRoom.id! });
  }

  const container = getContainer();
  
  const roomNumber = Math.floor(1000 + Math.random() * 9000);
  
  const room: GameRoom = {
    id: uuidv4(),
    roomNumber,
    creator: {
      userId: request.userId,
      nickname: request.nickname
    },
    players: [{
      userId: request.userId,
      nickname: request.nickname,
      color: 1,
      isReady: true
    }],
    spectators: [],
    board: Array(15).fill(null).map(() => Array(15).fill(0)),
    currentPlayer: 1,
    status: 'waiting',
    moveHistory: [],
    winner: null,
    createTime: new Date(),
    updateTime: new Date()
  };

  const { resource } = await container.items.create(room);
  return resource as GameRoom;
}

// 获取房间列表
export async function getRooms(): Promise<GameRoom[]> {
  const container = getContainer();
  
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.status IN ("waiting", "playing") ORDER BY c.createTime DESC'
    })
    .fetchAll();
  
  return resources as GameRoom[];
}

// 获取单个房间
export async function getRoom(roomId: string): Promise<GameRoom | null> {
  const container = getContainer();
  
  try {
    // 尝试通过查询获取房间，不依赖分区键
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: roomId }]
      })
      .fetchAll();
      
    if (resources.length > 0) {
      return resources[0] as GameRoom;
    }
    return null;
  } catch (error) {
    console.error('Error getting room:', error);
    return null;
  }
}

// 加入房间
export async function joinRoom(request: JoinRoomRequest): Promise<GameRoom> {
  // 检查用户是否已在其他房间
  const existingRoom = await findRoomByUserId(request.userId);
  if (existingRoom && existingRoom.id !== request.roomId) {
     await leaveRoom({ userId: request.userId, roomId: existingRoom.id! });
  }

  const container = getContainer();
  const room = await getRoom(request.roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }

  // 检查用户是否已在房间中
  const alreadyInRoom = room.players.some(p => p.userId === request.userId) ||
                        room.spectators.some(s => s.userId === request.userId);
  
  if (alreadyInRoom) {
    return room;
  }

  // 保存旧的状态用于替换操作（如果分区键是 status）
  const oldStatus = room.status;

  if (room.players.length >= 2) {
    // 加入为旁观者
    room.spectators.push({
      userId: request.userId,
      nickname: request.nickname,
      joinTime: new Date()
    });
  } else {
    // 加入为玩家
    room.players.push({
      userId: request.userId,
      nickname: request.nickname,
      color: 2,
      isReady: true
    });
    
    // 两个玩家都加入后开始游戏
    if (room.players.length === 2) {
      room.status = 'playing';
    }
  }

  room.updateTime = new Date();
  
  // 如果状态改变了，且状态是分区键，我们需要删除旧文档并创建新文档
  // 检查状态是否发生变化
  if (oldStatus !== room.status) {
    // 状态改变了，因为分区键是 /status，我们必须先删除旧文档，再创建新文档
    // 1. 删除旧文档 (使用旧状态作为分区键)
    await container.item(room.id!, oldStatus).delete();
    
    // 2. 创建新文档 (使用新状态)
    const { resource } = await container.items.create(room);
    
    // 通知房间内所有用户
    await sendToRoom(request.roomId, {
      type: 'room_update',
      data: resource
    });
    
    return resource as GameRoom;
  } else {
    // 状态没变，可以直接使用 replace 或 upsert
    // 显式指定分区键，确保操作正确
    const { resource } = await container.item(room.id!, room.status).replace(room);
    
    // 通知房间内所有用户
    await sendToRoom(request.roomId, {
      type: 'room_update',
      data: resource
    });
    
    return resource as GameRoom;
  }
}

// 下棋
export async function makeMove(request: MakeMoveRequest): Promise<GameRoom> {
  const container = getContainer();
  const room = await getRoom(request.roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }

  if (room.status !== 'playing') {
    throw new Error('Game is not in playing status');
  }

  // 保存旧的状态用于替换操作（如果分区键是 status）
  const oldStatus = room.status;

  // 验证是否是当前玩家
  const currentPlayerObj = room.players.find(p => p.color === room.currentPlayer);
  if (!currentPlayerObj || currentPlayerObj.userId !== request.userId) {
    throw new Error('Not your turn');
  }

  // 验证位置是否为空
  if (room.board[request.row][request.col] !== 0) {
    throw new Error('Position already occupied');
  }

  // 放置棋子
  room.board[request.row][request.col] = room.currentPlayer;
  room.moveHistory.push({
    row: request.row,
    col: request.col,
    player: room.currentPlayer
  });

  // 检查是否获胜
  const hasWon = checkWin(room.board, request.row, request.col);
  const isDraw = !hasWon && checkDraw(room.board);

  if (hasWon) {
    room.status = 'finished';
    const winner = room.players.find(p => p.color === room.currentPlayer);
    room.winner = winner!.nickname;
  } else if (isDraw) {
    room.status = 'finished';
    room.winner = '平局';
  } else {
    // 切换玩家
    room.currentPlayer = room.currentPlayer === 1 ? 2 : 1;
  }

  room.updateTime = new Date();
  
  let resource: GameRoom;

  // 如果状态改变了，且状态是分区键，我们需要删除旧文档并创建新文档
  if (oldStatus !== room.status) {
    // 状态改变了，因为分区键是 /status，我们必须先删除旧文档，再创建新文档
    // 1. 删除旧文档 (使用旧状态作为分区键)
    await container.item(room.id!, oldStatus).delete();
    
    // 2. 创建新文档 (使用新状态)
    const createResponse = await container.items.create(room);
    resource = createResponse.resource as GameRoom;
  } else {
    // 状态没变，可以直接使用 replace
    const replaceResponse = await container.item(room.id!, room.status).replace(room);
    resource = replaceResponse.resource as GameRoom;
  }
  
  console.log(`Sending game update to room ${request.roomId} for move at ${request.row},${request.col}`);
  
  // 通知房间内所有用户
  await sendToRoom(request.roomId, {
    type: 'game_update',
    data: resource
  });
  
  return resource;
}

// 检查获胜
function checkWin(board: number[][], row: number, col: number): boolean {
  const player = board[row][col];
  const directions = [
    [[0, 1], [0, -1]],   // 水平
    [[1, 0], [-1, 0]],   // 垂直
    [[1, 1], [-1, -1]],  // 主对角线
    [[1, -1], [-1, 1]]   // 副对角线
  ];

  for (const [dir1, dir2] of directions) {
    let count = 1;
    
    // 检查第一个方向
    for (let i = 1; i < 5; i++) {
      const newRow = row + dir1[0] * i;
      const newCol = col + dir1[1] * i;
      if (
        newRow >= 0 && newRow < 15 &&
        newCol >= 0 && newCol < 15 &&
        board[newRow][newCol] === player
      ) {
        count++;
      } else {
        break;
      }
    }

    // 检查第二个方向
    for (let i = 1; i < 5; i++) {
      const newRow = row + dir2[0] * i;
      const newCol = col + dir2[1] * i;
      if (
        newRow >= 0 && newRow < 15 &&
        newCol >= 0 && newCol < 15 &&
        board[newRow][newCol] === player
      ) {
        count++;
      } else {
        break;
      }
    }

    if (count >= 5) {
      return true;
    }
  }

  return false;
}

// 检查平局
function checkDraw(board: number[][]): boolean {
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 15; j++) {
      if (board[i][j] === 0) {
        return false;
      }
    }
  }
  return true;
}

// 根据用户ID查找房间
export async function findRoomByUserId(userId: string): Promise<GameRoom | null> {
  const container = getContainer();
  // 查询用户是否在 players 或 spectators 中
  const query = `
    SELECT * FROM c 
    WHERE EXISTS(SELECT VALUE p FROM p IN c.players WHERE p.userId = @userId) 
    OR EXISTS(SELECT VALUE s FROM s IN c.spectators WHERE s.userId = @userId)
  `;
  
  const { resources } = await container.items
    .query({
      query,
      parameters: [{ name: '@userId', value: userId }]
    })
    .fetchAll();
    
  if (resources.length > 0) {
    return resources[0] as GameRoom;
  }
  return null;
}

// 删除房间
export async function deleteRoom(roomId: string, status: string): Promise<void> {
  const container = getContainer();
  try {
    await container.item(roomId, status).delete();
  } catch (error) {
    console.error(`Failed to delete room ${roomId}:`, error);
  }
}

// 离开房间
export async function leaveRoom(request: LeaveRoomRequest): Promise<void> {
  const container = getContainer();
  let room = await getRoom(request.roomId);
  
  if (!room) {
    // 尝试通过 userId 查找，如果 roomId 不准确
    room = await findRoomByUserId(request.userId);
    if (!room) return; // 房间不存在或用户不在房间
  }

  // 检查用户是否在房间
  const playerIndex = room.players.findIndex(p => p.userId === request.userId);
  const spectatorIndex = room.spectators.findIndex(s => s.userId === request.userId);

  if (playerIndex === -1 && spectatorIndex === -1) {
    return; // 用户不在房间
  }

  const oldStatus = room.status;
  let shouldDelete = false;

  // 移除用户
  if (playerIndex !== -1) {
    room.players.splice(playerIndex, 1);
  } else if (spectatorIndex !== -1) {
    room.spectators.splice(spectatorIndex, 1);
  }

  // 从 PubSub 组移除
  await removeUserFromRoom(request.userId, room.id!);

  // 检查是否需要删除房间
  // 需求：当房间没有对战玩家时，将房间删除，并且同时将所有旁观者踢出房间
  if (room.players.length === 0) {
    shouldDelete = true;
  }

  if (shouldDelete) {
    // 踢出所有旁观者
    for (const spectator of room.spectators) {
       await removeUserFromRoom(spectator.userId, room.id!);
    }
    
    // 通知房间即将销毁
    await sendToRoom(room.id!, {
      type: 'room_deleted',
      roomId: room.id
    });

    // 删除房间
    await deleteRoom(room.id!, oldStatus);
  } else {
    // 如果玩家离开导致状态变化
    if (room.status === 'playing' && room.players.length < 2) {
       room.status = 'waiting'; 
       // 重置游戏盘面
       room.board = Array(15).fill(null).map(() => Array(15).fill(0));
       room.moveHistory = [];
       room.currentPlayer = 1;
       room.winner = null;
       // 剩下的玩家重置
       if (room.players[0]) {
         room.players[0].color = 1;
         room.players[0].isReady = true;
       }
    }

    room.updateTime = new Date();

    if (oldStatus !== room.status) {
      await container.item(room.id!, oldStatus).delete();
      const { resource } = await container.items.create(room);
      await sendToRoom(room.id!, { type: 'room_update', data: resource });
    } else {
      const { resource } = await container.item(room.id!, room.status).replace(room);
      await sendToRoom(room.id!, { type: 'room_update', data: resource });
    }
  }
}
