// 数据库初始化脚本
// 在微信开发者工具的云开发控制台 -> 数据库 -> 集合管理中创建以下集合

/**
 * 集合名称：game_rooms
 * 
 * 权限设置：
 * - 所有用户可读
 * - 所有用户可写
 * 
 * 索引：
 * 1. status (升序)
 * 2. createTime (降序)
 * 
 * 示例文档结构：
 */

const exampleRoom = {
  "_id": "auto-generated",
  "roomNumber": 1234, // 4位房间号
  "creator": {
    "openid": "user-openid",
    "nickname": "玩家1"
  },
  "players": [
    {
      "openid": "user-openid-1",
      "nickname": "玩家1",
      "color": 1, // 1=黑子, 2=白子
      "isReady": true
    },
    {
      "openid": "user-openid-2",
      "nickname": "玩家2",
      "color": 2,
      "isReady": true
    }
  ],
  "spectators": [
    {
      "openid": "user-openid-3",
      "nickname": "观众1",
      "joinTime": new Date()
    }
  ],
  "board": [], // 15x15 二维数组，初始为空
  "currentPlayer": 1, // 当前轮到哪个玩家 (1 或 2)
  "status": "playing", // waiting/playing/finished
  "moveHistory": [
    {
      "row": 7,
      "col": 7,
      "player": 1
    }
  ],
  "winner": null, // 获胜者昵称或 "平局"
  "createTime": new Date(),
  "updateTime": new Date()
}

/**
 * 在云开发控制台操作步骤：
 * 
 * 1. 打开微信开发者工具
 * 2. 点击顶部"云开发"按钮
 * 3. 进入数据库管理
 * 4. 点击"添加集合"
 * 5. 输入集合名：game_rooms
 * 6. 设置权限：
 *    - 读权限：所有用户可读
 *    - 写权限：所有用户可写
 * 7. 添加索引：
 *    - 字段：status，类型：升序
 *    - 字段：createTime，类型：降序
 */
