/**
 * NIM YX Auth Channel Plugin
 *
 * 云信 IM 安全认证插件
 * - 支持两种认证方式：authToken 或 (appId + appSecret)
 * - authUrl 可配置，不配则使用默认值
 * - 服务端控制凭证和权限开关
 * - 兼容 openclaw-nim 1.0.6+ multi-instance 格式
 */

import type { ChannelPlugin, OpenClawConfig } from "openclaw/plugin-sdk";
import { nimPlugin } from "openclaw-nim";
import type { NimAuthConfig } from "./types.js";
import { fetchNimConfig, validateAuthConfig } from "./auth.js";

/**
 * 默认 accountId（认证前使用，startAccount 中会被替换为实际值）
 */
const DEFAULT_ACCOUNT_ID = "default";

const meta = {
  id: "nim",
  label: "NIM YX (云信)",
  selectionLabel: "NIM YX - 云信安全认证",
  docsPath: "/channels/nim",
  blurb: "网易云信 IM（YX 安全认证模式）",
};

function getAuthConfig(cfg: OpenClawConfig): NimAuthConfig | null {
  const nimCfg = cfg.channels?.nim as NimAuthConfig | undefined;
  if (!nimCfg) return null;
  if (validateAuthConfig(nimCfg)) return null;
  return nimCfg;
}

export const nimYxAuthPlugin: ChannelPlugin = {
  id: "nim",
  meta: { ...meta },
  capabilities: nimPlugin.capabilities,
  agentPrompt: nimPlugin.agentPrompt,

  configSchema: {
    schema: {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
        appId: { type: "string" },
        appSecret: { type: "string" },
        authToken: { type: "string" },
        authUrl: { type: "string" },
      },
    },
  },

  config: {
    listAccountIds: () => [DEFAULT_ACCOUNT_ID],
    resolveAccount: (cfg) => ({
      accountId: DEFAULT_ACCOUNT_ID,
      enabled: getAuthConfig(cfg)?.enabled ?? false,
      configured: getAuthConfig(cfg) !== null,
    }),
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    isConfigured: (_account, cfg) => getAuthConfig(cfg) !== null,
  },

  security: nimPlugin.security,
  messaging: nimPlugin.messaging,
  outbound: nimPlugin.outbound,
  status: nimPlugin.status,

  gateway: {
    startAccount: async (ctx) => {
      const authConfig = getAuthConfig(ctx.cfg);
      if (!authConfig) throw new Error("[nim-yx-auth] Missing auth configuration");

      // 日志显示使用的认证方式
      const authMethod = authConfig.authToken
        ? `authToken: ${authConfig.authToken.substring(0, 8)}...`
        : `appId: ${authConfig.appId}`;
      ctx.log?.info(`[nim-yx-auth] Starting with ${authMethod}`);

      // 调用耘想 Auth 接口获取凭证和权限开关
      const config = await fetchNimConfig(authConfig);
      ctx.log?.info(`[nim-yx-auth] Config fetched - account: ${config.account}`);

      // 根据开关设置权限策略
      const p2pPolicy = config.enableP2P ? "open" : "disabled";
      const teamPolicy = config.enableTeam ? "open" : "disabled";
      const qchatPolicy = config.enableQChat ? "open" : "disabled";

      ctx.log?.info(`[nim-yx-auth] P2P: ${p2pPolicy}, Team: ${teamPolicy}, QChat: ${qchatPolicy}`);

      // 1.0.6+ multi-instance 格式：写入 instances[]
      const accountId = `${config.appKey}:${config.account}`;

      ctx.cfg = {
        ...ctx.cfg,
        channels: {
          ...ctx.cfg.channels,
          nim: {
            instances: [{
              enabled: true,
              appKey: config.appKey,
              account: config.account,
              token: config.token,
              p2p: { policy: p2pPolicy },
              team: { policy: teamPolicy },
              qchat: { policy: qchatPolicy },
            }],
          } as any,
        },
      };

      // 设置 accountId，让 1.0.6 的 startAccount 能正确解析实例
      (ctx as any).accountId = accountId;

      // 委托 openclaw-nim 1.0.6 启动连接
      return nimPlugin.gateway!.startAccount!(ctx);
    },
  },

  reload: { configPrefixes: ["channels.nim"] },
};

export default nimYxAuthPlugin;
