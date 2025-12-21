"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// lobby.ts
const api_1 = require("../../utils/api");
Page({
    data: {
        nickname: '',
        inputNickname: '',
        rooms: [],
        userId: '',
        isRefreshing: false
    },
    onLoad() {
        // 尝试从本地存储加载昵称
        const savedNickname = wx.getStorageSync('userNickname');
        const savedUserId = wx.getStorageSync('userId');
        // 总是优先加载 userId
        if (savedUserId) {
            this.setData({ userId: savedUserId });
        }
        else {
            // 生成唯一用户ID
            this.generateUserId();
        }
        if (savedNickname) {
            this.setData({
                nickname: savedNickname
            });
            this.refreshRooms();
        }
    },
    onShow() {
        // 页面显示时刷新房间列表
        if (this.data.nickname) {
            this.refreshRooms();
        }
    },
    // 生成用户ID
    generateUserId() {
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.setData({ userId });
        wx.setStorageSync('userId', userId);
    },
    onNicknameInput(e) {
        this.setData({
            inputNickname: e.detail.value
        });
    },
    confirmNickname() {
        const nickname = this.data.inputNickname.trim();
        if (!nickname) {
            wx.showToast({
                title: '请输入昵称',
                icon: 'none'
            });
            return;
        }
        this.setData({ nickname });
        wx.setStorageSync('userNickname', nickname);
        // 如果还没有 userId，生成一个
        if (!this.data.userId) {
            this.generateUserId();
        }
        this.refreshRooms();
    },
    // 创建房间
    async createRoom() {
        if (!this.data.nickname)
            return;
        wx.showLoading({ title: '创建中...' });
        try {
            const room = await api_1.api.createRoom(this.data.userId, this.data.nickname);
            wx.hideLoading();
            // 进入游戏房间
            wx.navigateTo({
                url: `/pages/game/game?roomId=${room.id}&isOnline=true`
            });
        }
        catch (err) {
            wx.hideLoading();
            console.error('创建房间失败', err);
            wx.showToast({
                title: err.message || '创建失败，请重试',
                icon: 'none'
            });
        }
    },
    // 刷新房间列表
    async refreshRooms() {
        this.setData({
            isRefreshing: true,
            rooms: [] // 清空列表以提供视觉反馈
        });
        try {
            const rooms = await api_1.api.getRooms();
            // 稍微延迟一下以展示加载效果
            setTimeout(() => {
                this.setData({
                    rooms,
                    isRefreshing: false
                });
            }, 500);
        }
        catch (err) {
            console.error('获取房间列表失败', err);
            wx.showToast({
                title: '获取房间列表失败',
                icon: 'none'
            });
            this.setData({ isRefreshing: false });
        }
    },
    // 加入房间
    async joinRoom(e) {
        const roomId = e.currentTarget.dataset.roomId;
        if (!this.data.nickname)
            return;
        wx.showLoading({ title: '加入中...' });
        try {
            const updatedRoom = await api_1.api.joinRoom(this.data.userId, this.data.nickname, roomId);
            wx.hideLoading();
            // 检查是否是旁观者
            const isSpectator = updatedRoom.spectators && updatedRoom.spectators.some((s) => s.userId === this.data.userId);
            if (isSpectator) {
                wx.showToast({
                    title: '以旁观者身份加入',
                    icon: 'none'
                });
            }
            // 进入游戏房间
            wx.navigateTo({
                url: `/pages/game/game?roomId=${roomId}&isOnline=true`
            });
        }
        catch (err) {
            wx.hideLoading();
            console.error('加入房间失败', err);
            wx.showToast({
                title: err.message || '加入失败，请重试',
                icon: 'none'
            });
        }
    }
});
