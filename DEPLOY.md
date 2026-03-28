# OpenClaw NIM YX Auth 部署文档

## 📋 概述

`openclaw-nim-yx-auth` 是一个基于 `openclaw-nim` 的云信 IM 安全认证插件，支持两种认证方式：
- `authToken` - 直接使用 Token 认证（推荐）
- `appId + appSecret` - 通过认证接口获取凭证

---

## 🚀 快速开始

### 前置条件

| 条件 | 要求 |
|------|------|
| OpenClaw 版本 | >= 2026.1.29 |
| Node.js 版本 | >= 18 |
| 插件目录 | `~/.openclaw/extensions/openclaw-nim-yx-auth/` |

### 部署步骤（3 步）

```bash
# 1. 复制插件到 extensions 目录
cp -r openclaw-nim-yx-auth ~/.openclaw/extensions/

# 2. 进入插件目录，安装依赖
cd ~/.openclaw/extensions/openclaw-nim-yx-auth
npm install
npm install nim-web-sdk-ng@10.9.77-alpha.3  # ⚠️ 必须指定版本！

# 3. 配置 openclaw.json（见下方配置章节）
```

---

## ⚠️ 关键注意事项

### 1. nim-web-sdk-ng 版本必须固定

**问题**：最新版 `nim-web-sdk-ng` 没有 `dist/nodejs/nim.js` 文件

**解决**：必须安装 `10.9.77-alpha.3` 版本

```bash
# ✅ 正确
npm install nim-web-sdk-ng@10.9.77-alpha.3

# ❌ 错误（默认安装最新版，会导致模块找不到）
npm install nim-web-sdk-ng
```

### 2. 插件 ID 必须一致

三个位置的 ID **必须完全相同**：

| 文件 | 字段 | 值 |
|------|------|-----|
| `openclaw.plugin.json` | `"id"` | `"nim"` |
| `index.ts` | `plugin.id` | `"nim"` |
| `channel.ts` | `nimYxAuthPlugin.id` | `"nim"` |

**错误示例**：
```
plugin id mismatch (config uses "openclaw-nim-yx-auth", export uses "nim")
```

### 3. 必须初始化 NIM Runtime

`index.ts` 中必须调用 `setNimRuntime`：

```typescript
import { setNimRuntime } from "openclaw-nim/src/runtime.js";

const plugin = {
  id: "nim",
  register(api: OpenClawPluginApi) {
    setNimRuntime(api.runtime);  // ⚠️ 必须调用！
    api.registerChannel({ plugin: nimYxAuthPlugin });
  },
};
```

**错误示例**：
```
NIM runtime not initialized. Call setNimRuntime first.
```

### 4. openclaw.plugin.json 扩展路径

```json
{
  "id": "nim",
  "extensions": ["./index.ts"]  // ✅ 正确，指向 .ts 文件
}
```

---

## 📁 目录结构详解

### 完整插件目录

```
~/.openclaw/extensions/openclaw-nim-yx-auth/
├── auth.ts                    # 认证逻辑
├── channel.ts                 # 插件主体
├── index.ts                   # 入口文件（含 register 函数）
├── types.ts                   # 类型定义
├── package.json               # 包配置
├── openclaw.plugin.json       # 插件元数据
├── README.md                  # 说明文档
└── node_modules/              # 依赖目录
    ├── openclaw-nim/          # NIM 基础插件
    └── nim-web-sdk-ng/        # 云信 SDK（必须是 10.9.77-alpha.3）
```

### node_modules 依赖

| 包名 | 版本要求 | 说明 |
|------|---------|------|
| `openclaw-nim` | ^0.3.0 | NIM 基础插件 |
| `nim-web-sdk-ng` | **10.9.77-alpha.3** | 云信 SDK（必须固定版本！） |

---

## ⚙️ 配置文件详解

### openclaw.json 完整配置

```json
{
  "plugins": {
    "enabled": true,
    "allow": ["feishu", "nim"],
    "entries": {
      "nim": {
        "enabled": true
      }
    },
    "load": {
      "paths": [
        "/home/node/.openclaw/extensions/openclaw-nim-yx-auth"
      ]
    }
  },
  "channels": {
    "nim": {
      "enabled": true,
      "authToken": "Ccu06OPZhOcYM0kl...",
      "nickName": "龙虾Bot"
    }
  }
}
```

### 配置字段说明

#### plugins 配置

| 字段 | 必填 | 说明 |
|------|------|------|
| `plugins.enabled` | ✅ | 启用插件系统 |
| `plugins.allow` | ✅ | 允许加载的插件 ID 列表 |
| `plugins.entries.<id>.enabled` | ✅ | 启用指定插件 |
| `plugins.load.paths` | ⚠️ | 显式指定插件路径（推荐配置） |

#### channels.nim 配置

| 字段 | 必填 | 说明 |
|------|------|------|
| `enabled` | ✅ | 启用 NIM 通道 |
| `authToken` | 方式一 | 认证 Token（推荐） |
| `appId` | 方式二 | 应用 ID |
| `appSecret` | 方式二 | 应用密钥 |
| `authUrl` | 可选 | 认证接口地址（默认已配置） |
| `nickName` | 可选 | 机器人昵称 |

---

## 🔧 文件详解

### index.ts（入口文件）

```typescript
/**
 * NIM YX Auth Extension - 入口文件
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { nimYxAuthPlugin } from "./channel.ts";
import { setNimRuntime } from "openclaw-nim/src/runtime.js";

const plugin = {
  id: "nim",  // ⚠️ 必须与 openclaw.plugin.json 和 channel.ts 一致
  name: "NIM YX Auth",
  description: "网易云信 IM 安全认证插件",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    // ⚠️ 必须调用，否则运行时报错
    setNimRuntime(api.runtime);
    // 注册 channel
    api.registerChannel({ plugin: nimYxAuthPlugin });
  },
};

export default plugin;

export { nimYxAuthPlugin };
export * from "./types.ts";
export * from "./auth.ts";
```

### openclaw.plugin.json（插件元数据）

```json
{
  "id": "nim",
  "channels": ["nim"],
  "extensions": ["./index.ts"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

### package.json（依赖配置）

```json
{
  "name": "openclaw-nim-yx-auth",
  "version": "1.0.0",
  "type": "module",
  "main": "index.ts",
  "types": "types.ts",
  "dependencies": {
    "openclaw-nim": "^0.3.0"
  },
  "peerDependencies": {
    "openclaw": ">=2026.1.29"
  }
}
```

---

## 🐛 故障排查

### 问题 1: Cannot find module 'nim-web-sdk-ng/dist/nodejs/nim.js'

**原因**：`nim-web-sdk-ng` 版本不对

**解决**：
```bash
npm install nim-web-sdk-ng@10.9.77-alpha.3
```

### 问题 2: plugin id mismatch

**原因**：插件 ID 不一致

**解决**：确保三处 ID 相同：
- `openclaw.plugin.json` → `"id": "nim"`
- `index.ts` → `plugin.id = "nim"`
- `channel.ts` → `nimYxAuthPlugin.id = "nim"`

### 问题 3: NIM runtime not initialized

**原因**：未调用 `setNimRuntime`

**解决**：在 `index.ts` 的 `register` 函数中添加：
```typescript
import { setNimRuntime } from "openclaw-nim/src/runtime.js";
setNimRuntime(api.runtime);
```

### 问题 4: plugin not found

**原因**：`plugins.allow` 或 `plugins.load.paths` 未配置

**解决**：
```json
{
  "plugins": {
    "allow": ["nim"],
    "load": {
      "paths": ["/home/node/.openclaw/extensions/openclaw-nim-yx-auth"]
    }
  }
}
```

### 问题 5: missing register/activate export

**原因**：`index.ts` 没有 `register` 函数

**解决**：确保 `index.ts` 导出的 `default` 对象包含 `register` 函数

---

## 📊 启动流程

```
OpenClaw 启动
      │
      ▼
扫描 extensions 目录（或 load.paths）
      │
      ▼
加载 openclaw.plugin.json
      │
      ▼
检查 plugins.allow 列表
      │
      ▼
加载 index.ts，调用 register()
      │
      ├── setNimRuntime(api.runtime)
      │
      └── api.registerChannel({ plugin: nimYxAuthPlugin })
      │
      ▼
读取 channels.nim 配置
      │
      ▼
调用 Auth API 获取凭证
      │
      ▼
注入配置到 openclaw-nim
      │
      ▼
NIM 客户端登录
      │
      ▼
Monitor 启动，等待消息 ✅
```

---

## 🛠️ 本地开发

### 安装依赖

```bash
cd openclaw-nim-yx-auth
npm install
npm install nim-web-sdk-ng@10.9.77-alpha.3
```

### 测试插件加载

```bash
cd ~/.openclaw/extensions/openclaw-nim-yx-auth

# 创建测试文件
cat > test.mjs << 'EOF'
import { createJiti } from 'jiti';
const jiti = createJiti(import.meta.url);

const mod = await jiti.import('./index.ts');
console.log('✅ 加载成功');
console.log('plugin id:', mod.default?.id);
console.log('register:', typeof mod.default?.register);
EOF

node test.mjs
```

---

## 🐳 Docker 部署

### 方式一：Dockerfile 预装

```dockerfile
FROM openclaw/openclaw:latest

# 复制插件
COPY openclaw-nim-yx-auth /home/node/.openclaw/extensions/openclaw-nim-yx-auth

# 安装依赖
RUN cd /home/node/.openclaw/extensions/openclaw-nim-yx-auth && \
    npm install && \
    npm install nim-web-sdk-ng@10.9.77-alpha.3
```

### 方式二：运行时安装

```bash
# 进入容器
docker exec -it openclaw-container bash

# 安装插件
cd /home/node/.openclaw/extensions
git clone <repo-url> openclaw-nim-yx-auth
cd openclaw-nim-yx-auth
npm install
npm install nim-web-sdk-ng@10.9.77-alpha.3
```

---

## ✅ 验证部署成功

### 检查日志

```bash
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log | grep -i nim
```

### 成功标志

```
[nim-yx-auth] Starting with authToken: Ccu06OPZ...
[nim-yx-auth] Config fetched - account: ocb_xxx
[nim-yx-auth] P2P: open, Team: open, QChat: disabled
[nim] login successful — account: ocb_xxx
[nim] monitor started — account: ocb_xxx
```

### 测试消息

发送消息后应该看到：
```
[nim] received messages — count: 1
[nim] received message — sender: xxx, type: text, session: p2p
[nim] creating reply dispatcher — target: xxx
[nim] dispatching to agent
```

---

## 📝 检查清单

部署前请确认：

- [ ] `nim-web-sdk-ng@10.9.77-alpha.3` 已安装
- [ ] `openclaw.plugin.json` 中 `id` 为 `"nim"`
- [ ] `index.ts` 中 `plugin.id` 为 `"nim"`
- [ ] `channel.ts` 中 `nimYxAuthPlugin.id` 为 `"nim"`
- [ ] `index.ts` 中调用了 `setNimRuntime(api.runtime)`
- [ ] `openclaw.json` 中 `plugins.allow` 包含 `"nim"`
- [ ] `openclaw.json` 中 `channels.nim.authToken` 已配置

---

## 🔗 相关链接

- [OpenClaw 文档](https://docs.openclaw.ai)
- [openclaw-nim npm](https://www.npmjs.com/package/openclaw-nim)
- [网易云信](https://yunxin.163.com/)

---

_文档更新: 2026-03-28_