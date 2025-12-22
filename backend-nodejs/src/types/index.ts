// types.ts - 数据类型定义
export interface Player {
  userId: string;
  nickname: string;
  color: number; // 1: 黑子, 2: 白子
  isReady: boolean;
}

export interface Spectator {
  userId: string;
  nickname: string;
  joinTime: Date;
}

export interface Move {
  row: number;
  col: number;
  player: number;
}

export interface GameRoom {
  id?: string;
  roomNumber: number;
  creator: {
    userId: string;
    nickname: string;
  };
  players: Player[];
  spectators: Spectator[];
  board: number[][];
  currentPlayer: number;
  status: 'waiting' | 'playing' | 'finished';
  moveHistory: Move[];
  winner: string | null;
  createTime: Date;
  updateTime: Date;
  lastActionTime: Date;
}

export interface CreateRoomRequest {
  userId: string;
  nickname: string;
}

export interface JoinRoomRequest {
  userId: string;
  nickname: string;
  roomId: string;
}

export interface MakeMoveRequest {
  userId: string;
  roomId: string;
  row: number;
  col: number;
}

export interface LeaveRoomRequest {
  userId: string;
  roomId: string;
}
