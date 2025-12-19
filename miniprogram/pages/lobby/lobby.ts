// lobby.ts
import { api } from '../../utils/api';

Page({
  data: {
    nickname: '',
    inputNickname: '',
    rooms: [] as any[],
    userId: ''
  },

  onLoad() {
    // 尝试从本地存储加载昵称
    const savedNickname = wx.getStorageSync('userNickname')
    const savedUserId = wx.getStorageSync('userId')
    
    if (savedNickname && savedUserId) {
      this.setData({ 
        nickname: savedNickname,
        userId: savedUserId
      })
      this.refreshRooms()
    } else if (!savedUserId) {
      // 生成唯一用户ID
      this.generateUserId()
    }
  },

  onShow() {
    // 页面显示时刷新房间列表
    if (this.data.nickname) {
      this.refreshRooms()
    }
  },

  // 生成用户ID
  generateUserId() {
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    this.setData({ userId })
    wx.setStorageSync('userId', userId)
  },

  onNicknameInput(e: any) {
    this.setData({
      inputNickname: e.detail.value
    })
  },

  confirmNickname() {
    const nickname = this.data.inputNickname.trim()
    if (!nickname) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    this.setData({ nickname })
    wx.setStorageSync('userNickname', nickname)
    
    // 如果还没有 userId，生成一个
    if (!this.data.userId) {
      this.generateUserId()
    }
    
    this.refreshRooms()
  },

  // 创建房间
  async createRoom() {
    if (!this.data.nickname) return

    wx.showLoading({ title: '创建中...' })

    try {
      const room = await api.createRoom(this.data.userId, this.data.nickname)
      
      wx.hideLoading()

      // 进入游戏房间
      wx.navigateTo({
        url: `/pages/game/game?roomId=${room.id}&isOnline=true`
      })
    } catch (err: any) {
      wx.hideLoading()
      console.error('创建房间失败', err)
      wx.showToast({
        title: err.message || '创建失败，请重试',
        icon: 'none'
      })
    }
  },

  // 刷新房间列表
  async refreshRooms() {
    try {
      const rooms = await api.getRooms()
      this.setData({ rooms })
    } catch (err: any) {
      console.error('获取房间列表失败', err)
      wx.showToast({
        title: '获取房间列表失败',
        icon: 'none'
      })
    }
  },

  // 加入房间
  async joinRoom(e: any) {
    const roomId = e.currentTarget.dataset.roomId
    const room = e.currentTarget.dataset.room

    if (!this.data.nickname) return

    wx.showLoading({ title: '加入中...' })

    try {
      const updatedRoom = await api.joinRoom(this.data.userId, this.data.nickname, roomId)
      
      wx.hideLoading()
      
      // 检查是否是旁观者
      const isSpectator = updatedRoom.spectators?.some((s: any) => s.userId === this.data.userId)
      
      if (isSpectator) {
        wx.showToast({
          title: '以旁观者身份加入',
          icon: 'none'
        })
      }

      // 进入游戏房间
      wx.navigateTo({
        url: `/pages/game/game?roomId=${roomId}&isOnline=true`
      })
    } catch (err: any) {
      wx.hideLoading()
      console.error('加入房间失败', err)
      wx.showToast({
        title: err.message || '加入失败，请重试',
        icon: 'none'
      })
    }
  }
})
