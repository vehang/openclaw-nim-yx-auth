# OpenClaw NIM YX Auth

网易云信 IM 安全认证插件 - 服务端控制凭证和权限

## ✨ 特性

- 🔐 **安全认证** - 用户只配置 `appId` + `appSecret`，凭证不暴露在配置文件
- 🔧 **灵活配置** - `authUrl` 可配置，不配则使用默认值
- 🎛️ **服务端控制** - 权限开关由服务端返回，统一管理
- 📦 **一键安装** - 发布到 npm，用户直接安装使用

## 📦 安装

```bash
npm install openclaw-nim-yx-auth
```

## ⚙️ 用户配置

### 方式一：最简配置（使用默认 authUrl）

```yaml
# ~/.openclaw/config/openclaw.yaml
channels:
  nim:
    enabled: true
    appId: "OC_xxx"           # 用户申请的 App ID
    appSecret: "xxx"           # 用户申请的密钥
```

### 方式二：完整配置（自定义 authUrl）

```yaml
# ~/.openclaw/config/openclaw.yaml
channels:
  nim:
    enabled: true
    appId: "OC_xxx"
    appSecret: "xxx"
    authUrl: "https://your-custom-server.com"  # 可选，覆盖默认地址
```

## 🔌 接口规范

### 请求

```
GET {authUrl}/im/openClaw/auth?appId={appId}&appSecret={appSecret}
```

### 响应

```json
{
  "code": 0,
  "msg": "操作成功",
  "successCode": "SUCCESS",
  "currentTime": 1710835200,
  "data": {
    "appKey": "aabbcc123456",
    "robotAccId": "ocb_1a2b3c4d5e6f",
    "robotToken": "ocb_11223344",
    "enableP2P": true,
    "enableTeam": true,
    "enableQChat": false
  }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `appKey` | string | ✅ | - | 云信应用 AppKey |
| `robotAccId` | string | ✅ | - | 机器人账号 ID |
| `robotToken` | string | ✅ | - | 认证 Token |
| `enableP2P` | boolean | ❌ | `true` | 是否允许单聊 |
| `enableTeam` | boolean | ❌ | `true` | 是否允许群聊 |
| `enableQChat` | boolean | ❌ | `false` | 是否允许圈组 |

## 🚀 启动流程

```
OpenClaw 启动
      │
      ▼
读取配置: appId + appSecret (+ authUrl 可选)
      │
      ▼
调用 Auth 接口获取凭证和权限
GET {authUrl}/im/openClaw/auth?appId=xxx&appSecret=xxx
      │
      ▼
服务端返回:
- appKey, robotAccId, robotToken
- enableP2P, enableTeam, enableQChat
      │
      ▼
初始化 openclaw-nim 插件
NIM 服务上线 ✅
```

## 🛠️ 部署配置

### 修改默认 Auth 地址

编辑 `auth.ts` 文件：

```typescript
const DEFAULT_AUTH_URL = "https://your-actual-server.com";
```

### 本地构建

```bash
npm install
npm run build
```

### 发布到 npm

```bash
npm login
npm publish
```

## 🔒 安全设计

| 传统方式 | 本方案 |
|----------|--------|
| 配置文件暴露凭证 | 只配置 `appId`/`appSecret` |
| 凭证长期有效不可控 | 服务端可控，可随时撤销 |
| 权限配置在客户端 | 权限由服务端返回 |
| Token 泄露风险高 | Token 在内存中，不落盘 |

## 📁 项目结构

```
nim-yx-auth/
├── index.ts              # 入口文件
├── auth.ts               # 认证逻辑
├── channel.ts            # Channel Plugin 实现
├── types.ts              # 类型定义
├── openclaw.plugin.json  # 插件元数据
├── package.json          # npm 配置
├── tsconfig.json         # TypeScript 配置
└── README.md             # 使用文档
```

## 📋 依赖

- `openclaw` >= 2026.1.29
- `openclaw-nim` ^0.3.0

## 📄 许可证

MIT

## 🔗 相关链接

- [OpenClaw](https://openclaw.ai/) - AI Agent 框架
- [网易云信](https://yunxin.163.com/) - IM 即时通讯服务