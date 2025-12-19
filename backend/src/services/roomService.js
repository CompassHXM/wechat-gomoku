"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.getRooms = getRooms;
exports.getRoom = getRoom;
exports.joinRoom = joinRoom;
exports.makeMove = makeMove;
// roomService.ts - 房间管理服务
const database_1 = require("../config/database");
const pubsub_1 = require("../config/pubsub");
const uuid_1 = require("uuid");
// 创建房间
async function createRoom(request) {
    const container = (0, database_1.getContainer)();
    const roomNumber = Math.floor(1000 + Math.random() * 9000);
    const room = {
        id: (0, uuid_1.v4)(),
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
    return resource;
}
// 获取房间列表
async function getRooms() {
    const container = (0, database_1.getContainer)();
    const { resources } = await container.items
        .query({
        query: 'SELECT * FROM c WHERE c.status IN ("waiting", "playing") ORDER BY c.createTime DESC'
    })
        .fetchAll();
    return resources;
}
// 获取单个房间
async function getRoom(roomId) {
    const container = (0, database_1.getContainer)();
    try {
        const { resource } = await container.item(roomId, 'waiting').read();
        return resource || null;
    }
    catch (error) {
        if (error.code === 404) {
            // 尝试其他状态
            try {
                const { resource } = await container.item(roomId, 'playing').read();
                return resource || null;
            }
            catch {
                try {
                    const { resource } = await container.item(roomId, 'finished').read();
                    return resource || null;
                }
                catch {
                    return null;
                }
            }
        }
        throw error;
    }
}
// 加入房间
async function joinRoom(request) {
    const container = (0, database_1.getContainer)();
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
    if (room.players.length >= 2) {
        // 加入为旁观者
        room.spectators.push({
            userId: request.userId,
            nickname: request.nickname,
            joinTime: new Date()
        });
    }
    else {
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
    const { resource } = await container.item(room.id, room.status).replace(room);
    // 通知房间内所有用户
    await (0, pubsub_1.sendToRoom)(request.roomId, {
        type: 'room_update',
        data: resource
    });
    return resource;
}
// 下棋
async function makeMove(request) {
    const container = (0, database_1.getContainer)();
    const room = await getRoom(request.roomId);
    if (!room) {
        throw new Error('Room not found');
    }
    if (room.status !== 'playing') {
        throw new Error('Game is not in playing status');
    }
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
        room.winner = winner.nickname;
    }
    else if (isDraw) {
        room.status = 'finished';
        room.winner = '平局';
    }
    else {
        // 切换玩家
        room.currentPlayer = room.currentPlayer === 1 ? 2 : 1;
    }
    room.updateTime = new Date();
    const { resource } = await container.item(room.id, room.status).replace(room);
    // 通知房间内所有用户
    await (0, pubsub_1.sendToRoom)(request.roomId, {
        type: 'game_update',
        data: resource
    });
    return resource;
}
// 检查获胜
function checkWin(board, row, col) {
    const player = board[row][col];
    const directions = [
        [[0, 1], [0, -1]], // 水平
        [[1, 0], [-1, 0]], // 垂直
        [[1, 1], [-1, -1]], // 主对角线
        [[1, -1], [-1, 1]] // 副对角线
    ];
    for (const [dir1, dir2] of directions) {
        let count = 1;
        // 检查第一个方向
        for (let i = 1; i < 5; i++) {
            const newRow = row + dir1[0] * i;
            const newCol = col + dir1[1] * i;
            if (newRow >= 0 && newRow < 15 &&
                newCol >= 0 && newCol < 15 &&
                board[newRow][newCol] === player) {
                count++;
            }
            else {
                break;
            }
        }
        // 检查第二个方向
        for (let i = 1; i < 5; i++) {
            const newRow = row + dir2[0] * i;
            const newCol = col + dir2[1] * i;
            if (newRow >= 0 && newRow < 15 &&
                newCol >= 0 && newCol < 15 &&
                board[newRow][newCol] === player) {
                count++;
            }
            else {
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
function checkDraw(board) {
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            if (board[i][j] === 0) {
                return false;
            }
        }
    }
    return true;
}
