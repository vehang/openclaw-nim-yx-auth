/**
 * NIM YX Auth Channel Plugin
 *
 * 云信 IM 安全认证插件
 * - 用户只配置 appId + appSecret
 * - authUrl 可配置，不配则使用默认值
 * - 服务端控制凭证和权限开关
 */

import type { ChannelPlugin, OpenClawConfig } from "openclaw/plugin-sdk";
import { nimPlugin } from "openclaw-nim";
import type { NimAuthConfig } from "./types.js";
import { fetchNimConfig, validateAuthConfig } from "./auth.js";

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
        authUrl: { type: "string" },  // 可选
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

      ctx.log?.info(`[nim-yx-auth] Starting with appId: ${authConfig.appId}`);

      // 调用 Auth 接口获取凭证和权限开关
      const config = await fetchNimConfig(authConfig);
      ctx.log?.info(`[nim-yx-auth] Config fetched - account: ${config.account}`);

      // 根据开关设置权限策略
      const p2pPolicy = config.enableP2P ? "open" : "disabled";
      const teamPolicy = config.enableTeam ? "open" : "disabled";
      const qchatPolicy = config.enableQChat ? "open" : "disabled";

      ctx.log?.info(`[nim-yx-auth] P2P: ${p2pPolicy}, Team: ${teamPolicy}, QChat: ${qchatPolicy}`);

      // 注入配置到 openclaw-nim
      ctx.cfg = {
        ...ctx.cfg,
        channels: {
          ...ctx.cfg.channels,
          nim: {
            enabled: true,
            appKey: config.appKey,
            account: config.account,
            token: config.token,
            p2p: { policy: p2pPolicy },
            team: { policy: teamPolicy },
            qchat: { policy: qchatPolicy },
          } as any,
        },
      };

      // 启动原始 nim plugin
      return nimPlugin.gateway!.startAccount!(ctx);
    },
  },

  reload: { configPrefixes: ["channels.nim"] },
};

export default nimYxAuthPlugin;