// websocket.ts - WebSocket连接管理（使用Azure Web PubSub）
import { api } from './api';

class WebSocketManager {
  private socket: WechatMiniprogram.SocketTask | null = null;
  private userId: string = '';
  private roomId: string = '';
  private messageHandlers: ((data: any) => void)[] = [];
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // 连接WebSocket
  async connect(userId: string, roomId: string): Promise<void> {
    this.userId = userId;
    this.roomId = roomId;

    try {
      // 获取连接令牌
      const tokenData = await api.getToken(userId, roomId);
      
      // 解析URL和Token
      // Azure SDK返回的URL包含access_token参数
      // 我们尝试将token放入header中，以避免URL过长或编码问题
      const urlObj = tokenData.url.split('?');
      const baseUrl = urlObj[0];
      const params = urlObj[1];
      let token = '';
      
      if (params) {
        const searchParams = params.split('&');
        for (const param of searchParams) {
          const parts = param.split('=');
          const key = parts[0];
          const value = parts[1];
          if (key === 'access_token') {
            token = value;
            break;
          }
        }
      }

      // 创建WebSocket连接
      console.log('Connecting to WebSocket...', tokenData.url);
      this.socket = wx.connectSocket({
        url: tokenData.url,
        // protocols: ['json.webpubsub.azure.v1'], // 暂时移除子协议，尝试解决 Invalid HTTP status
        perMessageDeflate: false,
        fail: (err) => {
          console.error('WebSocket连接失败:', err);
        }
      });

      // 监听连接打开
      this.socket.onOpen(() => {
        console.log('WebSocket已连接');
        this.reconnectAttempts = 0;
        
        // 加入房间组 - 发送给后端处理
        // 注意：如果后端没有配置 upstream，这个消息会被忽略
        // 但我们已经在后端配置了 event handler 来处理这个消息
        this.send({
          type: 'joinGroup',
          group: roomId
        });
      });

      // 监听消息
      this.socket.onMessage((res) => {
        try {
          console.log('Raw WebSocket message:', res.data);
          const data = JSON.parse(res.data as string);
          console.log('Parsed message:', data);
          
          // 通知所有处理器
          this.messageHandlers.forEach(handler => {
            handler(data);
          });
        } catch (err) {
          console.error('消息解析失败:', err);
        }
      });

      // 监听连接关闭
      this.socket.onClose((res) => {
        console.log('WebSocket已断开', res);
        console.log('Close Code:', res.code);
        console.log('Close Reason:', res.reason);
        this.socket = null;
        
        // 尝试重连
        this.attemptReconnect();
      });

      // 监听错误
      this.socket.onError((err) => {
        console.error('WebSocket错误:', err);
      });

    } catch (err) {
      console.error('连接WebSocket失败:', err);
      throw err;
    }
  }

  // 尝试重连
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('达到最大重连次数，停止重连');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`将在 ${delay}ms 后进行第 ${this.reconnectAttempts} 次重连`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.userId && this.roomId) {
        this.connect(this.userId, this.roomId);
      }
    }, delay) as any;
  }

  // 发送消息
  send(data: any): void {
    if (!this.socket) {
      console.warn('WebSocket未连接');
      return;
    }

    this.socket.send({
      data: JSON.stringify(data),
      fail: (err) => {
        console.error('发送消息失败:', err);
      }
    });
  }

  // 添加消息处理器
  onMessage(handler: (data: any) => void): void {
    this.messageHandlers.push(handler);
  }

  // 移除消息处理器
  offMessage(handler: (data: any) => void): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  // 断开连接
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close({
        success: () => {
          console.log('WebSocket已主动关闭');
        }
      });
      this.socket = null;
    }

    this.messageHandlers = [];
    this.reconnectAttempts = 0;
  }

  // 检查连接状态
  isConnected(): boolean {
    return this.socket !== null;
  }
}

// 导出单例
export const wsManager = new WebSocketManager();
