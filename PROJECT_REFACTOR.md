# 项目结构优化记录

## 🎯 优化目标

- 清理过期文件
- 整理文档到统一目录
- 优化项目结构
- 提高项目可维护性

## 📋 优化内容

### 1. 新增目录结构

```
wechat-gomoku/
├── docs/                    # 📚 统一文档目录（新增）
│   ├── deployment/         # 部署相关文档
│   ├── migration/          # 迁移指南
│   ├── API_DOCUMENTATION.md
│   ├── DESIGN_DOCUMENT.md
│   ├── 云开发配置说明.md
│   └── 云服务方案对比.md
│
├── scripts/                 # 🛠️ 工具脚本目录（新增）
│   ├── deploy-azure-go.ps1
│   ├── test-backend.ps1
│   ├── test-backend-go.ps1
│   └── database-init.js
│
├── backend-nodejs/          # Node.js 后端（重命名）
└── backend-go/              # Go 后端
```

### 2. 文档整理

#### 移动到 `docs/` 目录：
- ✅ `API_DOCUMENTATION.md`
- ✅ `DESIGN_DOCUMENT.md`
- ✅ `云开发配置说明.md`
- ✅ `云服务方案对比.md`

#### 移动到 `docs/deployment/`：
- ✅ `Azure部署指南.md`
- ✅ `AZURE_RUNTIME_AND_DOCS_UPDATE.md`
- ✅ `backend-go/AZURE_DEPLOY.md` → `AZURE_DEPLOY_GO.md`
- ✅ `backend-go/DEPLOYMENT_FIXES.md`
- ✅ `backend-go/README.md` → `BACKEND_GO_README.md`

#### 移动到 `docs/migration/`：
- ✅ `MIGRATION_TO_GO.md`

### 3. 脚本整理

移动到 `scripts/` 目录：
- ✅ `test-backend.ps1` - Node.js 后端测试脚本
- ✅ `backend-go/test-backend.ps1` → `test-backend-go.ps1`
- ✅ `backend-go/deploy-azure.ps1` → `deploy-azure-go.ps1`
- ✅ `database-init.js` - 数据库初始化脚本

### 4. 清理过期文件

#### 删除的目录：
- ❌ `cloudfunctions/` - 云函数目录（已迁移到 Azure，不再使用）

#### 清理的文件：
- ❌ `miniprogram/**/*.js` - TypeScript 编译产物（应重新编译生成）
- ❌ `backend-nodejs/src/**/*.js` - TypeScript 编译产物

### 5. 目录重命名

- ✅ `backend/` → `backend-nodejs/` - 更明确的命名

### 6. 更新的文件

#### `README.md`
- 更新项目结构说明
- 更新文档链接
- 添加后端切换说明
- 简化快速开始流程
- 添加常见问题解答
- 删除重复的腾讯云开发说明

#### `docs/README.md`（新增）
- 文档索引和导航
- 按类别组织的文档列表
- 快速链接到相关资源

## 📊 优化效果

### 前后对比

**优化前：**
```
根目录下 8+ 个 Markdown 文档
文档分散在各个目录
脚本文件混在项目根目录
编译产物混杂在源代码中
cloudfunctions 已废弃但未删除
```

**优化后：**
```
docs/ 统一管理所有文档
scripts/ 集中管理所有脚本
清理了所有编译产物
删除了过期的 cloudfunctions
目录命名更加明确
```

### 改进点

1. **文档管理**
   - ✅ 所有文档集中在 `docs/` 目录
   - ✅ 按类型分类（deployment, migration）
   - ✅ 添加了文档索引页

2. **脚本管理**
   - ✅ 所有脚本集中在 `scripts/` 目录
   - ✅ 脚本命名更清晰（test-backend-go.ps1）

3. **代码清理**
   - ✅ 删除所有 TypeScript 编译产物
   - ✅ 删除过期的云函数代码
   - ✅ 保持源代码目录整洁

4. **命名规范**
   - ✅ backend → backend-nodejs（更明确）
   - ✅ 脚本添加后缀（-go, -nodejs）

5. **README 优化**
   - ✅ 清晰的项目结构图
   - ✅ 后端版本对比说明
   - ✅ 快速开始指南
   - ✅ 常见问题解答
   - ✅ 删除重复和过期内容

## 🔄 后续维护建议

1. **编译管理**
   - 使用 `npm run build` 编译前端
   - 使用 `npm run watch` 开发时自动编译
   - 不要提交 `.js` 编译产物到 Git

2. **文档更新**
   - 新文档统一放在 `docs/` 目录
   - 更新 `docs/README.md` 索引

3. **脚本管理**
   - 新脚本统一放在 `scripts/` 目录
   - 使用清晰的命名规范

4. **版本管理**
   - 建议在 `.gitignore` 中添加：
     ```
     # TypeScript 编译产物
     miniprogram/**/*.js
     backend-nodejs/src/**/*.js
     !miniprogram/app.js  # 如果需要
     ```

## ✅ 验证清单

- [x] 文档已移动到 docs/ 目录
- [x] 脚本已移动到 scripts/ 目录
- [x] README.md 已更新
- [x] docs/README.md 已创建
- [x] cloudfunctions/ 已删除
- [x] TypeScript 编译产物已清理
- [x] backend 已重命名为 backend-nodejs
- [x] 文档链接已更新
- [x] 所有路径引用已更新

## 📌 注意事项

1. **编译 TypeScript**：清理了 `.js` 文件后，需要重新编译：
   ```bash
   npm install
   npm run build
   ```

2. **更新部署脚本路径**：如果有 CI/CD 配置，需要更新脚本路径：
   - `backend-go/deploy-azure.ps1` → `scripts/deploy-azure-go.ps1`

3. **更新文档链接**：如果有外部文档引用，需要更新路径：
   - `Azure部署指南.md` → `docs/deployment/Azure部署指南.md`

4. **Git 提交**：建议创建单独的 commit：
   ```bash
   git add .
   git commit -m "refactor: 重构项目结构，整理文档和脚本"
   ```
