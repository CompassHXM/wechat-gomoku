// game.ts
import { api } from '../../utils/api';
import { wsManager } from '../../utils/websocket';

Page({
  data: {
    currentPlayer: 1, // 1: 黑子, 2: 白子
    gameStatus: '游戏进行中',
    board: [] as number[][], // 0: 空, 1: 黑子, 2: 白子
    boardSize: 15,
    cellSize: 0,
    canvasLeft: 0,
    canvasTop: 0,
    moveHistory: [] as {row: number, col: number, player: number}[],
    gameOver: false,
    // 联网对战相关
    isOnline: false,
    roomId: '',
    myColor: 0, // 我的颜色：1黑 2白
    isSpectator: false,
    blackPlayer: '黑方',
    whitePlayer: '白方',
    myUserId: ''
  },

  canvas: null as any,
  ctx: null as any,

  onLoad(options: any) {
    // 检查是否是联网模式
    if (options.roomId && options.isOnline === 'true') {
      this.setData({
        isOnline: true,
        roomId: options.roomId,
        myUserId: wx.getStorageSync('userId') || ''
      })
      this.initOnlineGame()
    } else {
      this.initGame()
    }
  },

  onUnload() {
    // 页面卸载时关闭WebSocket连接
    if (this.data.isOnline) {
      // 离开房间
      if (this.data.roomId && this.data.myUserId) {
        api.leaveRoom(this.data.myUserId, this.data.roomId).catch(err => {
          console.error('Failed to leave room:', err);
        });
      }
      wsManager.disconnect()
    }
  },

  // 初始化联网游戏
  async initOnlineGame() {
    wx.showLoading({ title: '加载中...' })
    
    try {
      // 获取房间信息
      const room = await api.getRoom(this.data.roomId)

      if (!room) {
        wx.hideLoading()
        wx.showToast({
          title: '房间不存在',
          icon: 'none'
        })
        return
      }

      // 判断玩家身份
      const myPlayer = room.players.find((p: any) => p.userId === this.data.myUserId)
      const isSpectator = !myPlayer

      let blackPlayer = '等待加入...'
      let whitePlayer = '等待加入...'
      
      if (room.players.length > 0) {
        blackPlayer = room.players[0].nickname
      }
      if (room.players.length > 1) {
        whitePlayer = room.players[1].nickname
      }

      this.setData({
        myColor: myPlayer ? myPlayer.color : 0,
        isSpectator,
        blackPlayer,
        whitePlayer,
        currentPlayer: room.currentPlayer || 1,
        gameStatus: room.status === 'waiting' ? '等待玩家加入...' : '游戏进行中'
      })

      // 初始化棋盘
      await this.initGame()

      // 如果房间已有棋局，恢复棋盘
      if (room.board && room.board.length > 0) {
        this.setData({
          board: room.board,
          moveHistory: room.moveHistory || [],
          currentPlayer: room.currentPlayer || 1
        })
        this.renderBoard()
      }

      wx.hideLoading()

      // 连接WebSocket接收实时更新
      await this.connectWebSocket()

    } catch (err: any) {
      wx.hideLoading()
      console.error('初始化游戏失败', err)
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    }
  },

  // 连接WebSocket
  async connectWebSocket() {
    try {
      await wsManager.connect(this.data.myUserId, this.data.roomId)
      
      // 监听消息
      wsManager.onMessage((data: any) => {
        console.log('收到WebSocket消息:', data)
        
        if (data.type === 'room_update' || data.type === 'game_update') {
          this.handleRoomUpdate(data.data)
        }
      })
    } catch (err) {
      console.error('WebSocket连接失败:', err)
      wx.showToast({
        title: 'WebSocket连接失败',
        icon: 'none'
      })
    }
  },

  // 处理房间更新
  handleRoomUpdate(room: any) {
    console.log('房间数据更新', room)
    
    // 更新玩家信息
    let blackPlayer = '等待加入...'
    let whitePlayer = '等待加入...'
    
    if (room.players.length > 0) {
      blackPlayer = room.players[0].nickname
    }
    if (room.players.length > 1) {
      whitePlayer = room.players[1].nickname
    }

    // 更新游戏状态
    let gameStatus = '游戏进行中'
    if (room.status === 'waiting') {
      gameStatus = '等待玩家加入...'
    } else if (room.status === 'finished') {
      gameStatus = room.winner ? `${room.winner}获胜！` : '游戏结束'
    }

    const wasGameOver = this.data.gameOver
    const isGameOver = room.status === 'finished'

    this.setData({
      board: room.board || this.data.board,
      currentPlayer: room.currentPlayer || 1,
      moveHistory: room.moveHistory || [],
      gameOver: room.status === 'finished',
      gameStatus,
      blackPlayer,
      whitePlayer
    }, () => {
      // 重绘棋盘
      this.renderBoard()
    })

    if (!wasGameOver && isGameOver) {
      const winnerText = room.winner ? `${room.winner}获胜！` : '游戏结束'
      wx.showToast({
        title: winnerText,
        icon: 'success',
        duration: 2000
      })
      
      setTimeout(() => {
        wx.showModal({
          title: '游戏结束',
          content: winnerText,
          showCancel: false,
          confirmText: '返回大厅',
          success: (res) => {
            if (res.confirm) {
              this.backToLobby()
            }
          }
        })
      }, 1000)
    }
  },

  async initGame() {
    const board: number[][] = []
    for (let i = 0; i < this.data.boardSize; i++) {
      board[i] = []
      for (let j = 0; j < this.data.boardSize; j++) {
        board[i][j] = 0
      }
    }

    this.setData({
      board,
      currentPlayer: 1,
      gameStatus: '游戏进行中',
      moveHistory: [],
      gameOver: false
    })

    // 初始化 Canvas 2D
    await this.initCanvas()
  },

  async initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#gomoku')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          
          const dpr = wx.getSystemInfoSync().pixelRatio
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)

          this.canvas = canvas
          this.ctx = ctx

          this.setData({
            cellSize: res[0].width / this.data.boardSize
          })

          this.renderBoard()
        }
      })
  },

  renderBoard() {
    if (!this.ctx) {
      return
    }

    try {
      const ctx = this.ctx
      const canvasSize = this.data.cellSize * this.data.boardSize
      
      // 清空画布
      ctx.clearRect(0, 0, canvasSize, canvasSize)

      // 绘制背景
      ctx.fillStyle = '#dcb35c'
      ctx.fillRect(0, 0, canvasSize, canvasSize)

      // 绘制网格线
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1

      for (let i = 0; i < this.data.boardSize; i++) {
        // 垂直线
        ctx.beginPath()
        ctx.moveTo(this.data.cellSize * (i + 0.5), this.data.cellSize * 0.5)
        ctx.lineTo(this.data.cellSize * (i + 0.5), canvasSize - this.data.cellSize * 0.5)
        ctx.stroke()

        // 水平线
        ctx.beginPath()
        ctx.moveTo(this.data.cellSize * 0.5, this.data.cellSize * (i + 0.5))
        ctx.lineTo(canvasSize - this.data.cellSize * 0.5, this.data.cellSize * (i + 0.5))
        ctx.stroke()
      }

      // 绘制星位（天元和四个角的星位）
      const starPoints = [
        [3, 3], [3, 11], [7, 7], [11, 3], [11, 11]
      ]
      ctx.fillStyle = '#000000'
      starPoints.forEach(([row, col]) => {
        ctx.beginPath()
        ctx.arc(
          this.data.cellSize * (col + 0.5),
          this.data.cellSize * (row + 0.5),
          3,
          0,
          2 * Math.PI
        )
        ctx.fill()
      })

      // 绘制所有棋子
      for (let i = 0; i < this.data.boardSize; i++) {
        for (let j = 0; j < this.data.boardSize; j++) {
          if (this.data.board[i][j] !== 0) {
            this.drawPiece(ctx, i, j, this.data.board[i][j])
          }
        }
      }

      // 绘制最后一步的标记
      if (this.data.moveHistory.length > 0) {
        const lastMove = this.data.moveHistory[this.data.moveHistory.length - 1]
        this.drawLastMoveMarker(ctx, lastMove.row, lastMove.col)
      }
    } catch (error) {
      console.error('renderBoard error:', error)
    }
  },

  drawLastMoveMarker(ctx: any, row: number, col: number) {
    const x = this.data.cellSize * (col + 0.5)
    const y = this.data.cellSize * (row + 0.5)
    const size = this.data.cellSize * 0.25

    ctx.save()
    ctx.lineCap = 'round'
    
    // 绘制红色中心线
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x - size, y)
    ctx.lineTo(x + size, y)
    ctx.moveTo(x, y - size)
    ctx.lineTo(x, y + size)
    ctx.stroke()
    
    ctx.restore()
  },

  drawPiece(ctx: any, row: number, col: number, player: number) {
    const x = this.data.cellSize * (col + 0.5)
    const y = this.data.cellSize * (row + 0.5)
    const radius = this.data.cellSize * 0.4

    // 绘制棋子
    ctx.fillStyle = player === 1 ? '#000000' : '#FFFFFF'
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fill()

    // 给白子添加黑色边框
    if (player === 2) {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // 添加高光效果
    const gradient = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      0,
      x - radius * 0.3,
      y - radius * 0.3,
      radius
    )
    if (player === 1) {
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    } else {
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    }
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.5, 0, 2 * Math.PI)
    ctx.fill()
  },

  handleTap(e: any) {
    if (this.data.gameOver) {
      return
    }

    // 联网模式下的权限检查
    if (this.data.isOnline) {
      // 旁观者不能下棋
      if (this.data.isSpectator) {
        wx.showToast({
          title: '旁观者不能下棋',
          icon: 'none'
        })
        return
      }

      // 不是自己的回合
      if (this.data.currentPlayer !== this.data.myColor) {
        wx.showToast({
          title: '请等待对方下棋',
          icon: 'none'
        })
        return
      }
    }

    // 获取触摸点相对于canvas的坐标
    const touch = e.touches[0]
    const x = touch.x
    const y = touch.y

    console.log('触摸坐标:', x, y)
    console.log('cellSize:', this.data.cellSize)

    // 计算点击位置对应的棋盘坐标
    const col = Math.round(x / this.data.cellSize - 0.5)
    const row = Math.round(y / this.data.cellSize - 0.5)

    console.log('棋盘坐标:', row, col)

    // 检查是否在棋盘范围内
    if (row < 0 || row >= this.data.boardSize || col < 0 || col >= this.data.boardSize) {
      console.log('坐标超出范围')
      return
    }

    // 检查该位置是否已有棋子
    if (this.data.board[row][col] !== 0) {
      wx.showToast({
        title: '此位置已有棋子',
        icon: 'none',
        duration: 1500
      })
      return
    }

    // 放置棋子
    if (this.data.isOnline) {
      this.makeOnlineMove(row, col)
    } else {
      this.makeLocalMove(row, col)
    }
  },

  // 本地模式下棋
  makeLocalMove(row: number, col: number) {
    const board = this.data.board
    board[row][col] = this.data.currentPlayer

    // 记录移动历史
    const moveHistory = [...this.data.moveHistory]
    moveHistory.push({
      row,
      col,
      player: this.data.currentPlayer
    })

    console.log('放置棋子:', row, col, this.data.currentPlayer)
    console.log('moveHistory updated, length:', moveHistory.length)

    this.setData({
      board,
      moveHistory
    }, () => {
      // 在setData回调中重新绘制棋盘
      console.log('开始重绘棋盘')
      this.renderBoard()
    })

    // 检查是否获胜
    if (this.checkWin(row, col)) {
      const winner = this.data.currentPlayer === 1 ? '黑子' : '白子'
      this.setData({
        gameStatus: `${winner}获胜！`,
        gameOver: true
      })
      
      wx.showToast({
        title: `${winner}获胜！`,
        icon: 'success',
        duration: 2000
      })

      setTimeout(() => {
        wx.showModal({
          title: '游戏结束',
          content: `${winner}获胜！`,
          showCancel: false,
          confirmText: '再来一局',
          success: (res) => {
            if (res.confirm) {
              this.restartGame()
            }
          }
        })
      }, 1000)
      return
    }

    // 检查是否平局
    if (this.checkDraw()) {
      this.setData({
        gameStatus: '平局！',
        gameOver: true
      })
      wx.showModal({
        title: '游戏结束',
        content: '平局！',
        showCancel: false,
        confirmText: '再来一局',
        success: (res) => {
          if (res.confirm) {
            this.restartGame()
          }
        }
      })
      return
    }

    // 切换玩家
    this.setData({
      currentPlayer: this.data.currentPlayer === 1 ? 2 : 1
    })
  },

  // 联网模式下棋
  async makeOnlineMove(row: number, col: number) {
    try {
      wx.showLoading({ title: '下棋中...' })

      await api.makeMove(this.data.myUserId, this.data.roomId, row, col)

      wx.hideLoading()

      // 房间更新会通过WebSocket推送，无需手动更新

    } catch (err: any) {
      wx.hideLoading()
      console.error('下棋失败', err)
      wx.showToast({
        title: err.message || '下棋失败，请重试',
        icon: 'none'
      })
    }
  },

  checkWin(row: number, col: number): boolean {
    const player = this.data.board[row][col]
    const directions = [
      [[0, 1], [0, -1]],   // 水平
      [[1, 0], [-1, 0]],   // 垂直
      [[1, 1], [-1, -1]],  // 主对角线
      [[1, -1], [-1, 1]]   // 副对角线
    ]

    for (const [dir1, dir2] of directions) {
      let count = 1
      
      // 检查第一个方向
      for (let i = 1; i < 5; i++) {
        const newRow = row + dir1[0] * i
        const newCol = col + dir1[1] * i
        if (
          newRow >= 0 && newRow < this.data.boardSize &&
          newCol >= 0 && newCol < this.data.boardSize &&
          this.data.board[newRow][newCol] === player
        ) {
          count++
        } else {
          break
        }
      }

      // 检查第二个方向
      for (let i = 1; i < 5; i++) {
        const newRow = row + dir2[0] * i
        const newCol = col + dir2[1] * i
        if (
          newRow >= 0 && newRow < this.data.boardSize &&
          newCol >= 0 && newCol < this.data.boardSize &&
          this.data.board[newRow][newCol] === player
        ) {
          count++
        } else {
          break
        }
      }

      if (count >= 5) {
        return true
      }
    }

    return false
  },

  checkDraw(): boolean {
    for (let i = 0; i < this.data.boardSize; i++) {
      for (let j = 0; j < this.data.boardSize; j++) {
        if (this.data.board[i][j] === 0) {
          return false
        }
      }
    }
    return true
  },

  undoMove() {
    if (this.data.moveHistory.length === 0) {
      return
    }

    const moveHistory = this.data.moveHistory
    const lastMove = moveHistory.pop()

    if (lastMove) {
      const board = this.data.board
      board[lastMove.row][lastMove.col] = 0

      this.setData({
        board,
        moveHistory,
        currentPlayer: lastMove.player,
        gameStatus: '游戏进行中',
        gameOver: false
      })

      this.renderBoard()
    }
  },

  restartGame() {
    this.initGame()
  },

  backToLobby() {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({
          url: '/pages/lobby/lobby'
        })
      }
    })
  }
})
