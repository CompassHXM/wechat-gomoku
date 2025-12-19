# Docker配置文件
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制TypeScript配置和源代码
COPY tsconfig.json ./
COPY src ./src

# 构建TypeScript
RUN npm install -g typescript
RUN npm run build

# 删除开发依赖和源代码
RUN npm prune --production
RUN rm -rf src tsconfig.json

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "dist/index.js"]
