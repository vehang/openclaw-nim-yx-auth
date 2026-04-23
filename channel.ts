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
import { logger } from "./logger.js";

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
  if (!nimCfg) {
    logger.warn("CONFIG", "channels.nim 配置不存在");
    return null;
  }
  const err = validateAuthConfig(nimCfg);
  if (err) {
    logger.warn("CONFIG", "认证配置校验失败:", err);
    return null;
  }
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
    listAccountIds: () => {
      logger.info("CONFIG", "listAccountIds →", [DEFAULT_ACCOUNT_ID]);
      return [DEFAULT_ACCOUNT_ID];
    },
    resolveAccount: (cfg) => {
      const authConfig = getAuthConfig(cfg);
      const result = {
        accountId: DEFAULT_ACCOUNT_ID,
        enabled: authConfig?.enabled ?? false,
        configured: authConfig !== null,
      };
      logger.info("CONFIG", "resolveAccount →", result);
      return result;
    },
    defaultAccountId: () => {
      logger.info("CONFIG", "defaultAccountId →", DEFAULT_ACCOUNT_ID);
      return DEFAULT_ACCOUNT_ID;
    },
    isConfigured: (_account, cfg) => {
      const configured = getAuthConfig(cfg) !== null;
      logger.info("CONFIG", `isConfigured → ${configured}`);
      return configured;
    },
  },

  security: nimPlugin.security,
  messaging: nimPlugin.messaging,
  outbound: nimPlugin.outbound,
  status: nimPlugin.status,

  gateway: {
    startAccount: async (ctx) => {
      const STEPS = 8;
      logger.step(1, STEPS, "startAccount 被调用");

      // === Step 1: 读取认证配置 ===
      const authConfig = getAuthConfig(ctx.cfg);
      if (!authConfig) {
        const err = new Error("[nim-yx-auth] Missing auth configuration - 请检查 channels.nim 中的 authToken 或 appId/appSecret");
        logger.error("START", err.message);
        throw err;
      }
      logger.step(2, STEPS, "认证配置读取成功");

      // === Step 2: 显示认证方式 ===
      if (authConfig.authToken) {
        logger.info("START", `认证方式: authToken (${authConfig.authToken.substring(0, 8)}...)`);
      } else {
        logger.info("START", `认证方式: appId (${authConfig.appId})`);
      }
      if (authConfig.authUrl) {
        logger.info("START", `Auth URL: ${authConfig.authUrl}`);
      }

      // === Step 3: 调用耘想 Auth 接口 ===
      logger.step(3, STEPS, "调用耘想 Auth 接口获取凭证...");
      let fetchedConfig;
      try {
        fetchedConfig = await fetchNimConfig(authConfig);
      } catch (err: any) {
        logger.error("START", "Auth 接口调用失败:", err.message);
        throw new Error(`[nim-yx-auth] Auth 接口调用失败: ${err.message}`);
      }

      logger.step(4, STEPS, `凭证获取成功 - account: ${fetchedConfig.account}, appKey: ${fetchedConfig.appKey}`);

      // === Step 4: 计算权限策略 ===
      const p2pPolicy = fetchedConfig.enableP2P ? "open" : "disabled";
      const teamPolicy = fetchedConfig.enableTeam ? "open" : "disabled";
      const qchatPolicy = fetchedConfig.enableQChat ? "open" : "disabled";
      logger.info("START", `权限策略 → P2P: ${p2pPolicy}, Team: ${teamPolicy}, QChat: ${qchatPolicy}`);

      // === Step 5: 构建 instances 配置 ===
      const accountId = `${fetchedConfig.appKey}:${fetchedConfig.account}`;
      logger.step(5, STEPS, `构建 instances 配置, accountId: ${accountId}`);

      const instanceConfig = {
        enabled: true,
        appKey: fetchedConfig.appKey,
        account: fetchedConfig.account,
        token: fetchedConfig.token.substring(0, 8) + "...",
        p2p: { policy: p2pPolicy },
        team: { policy: teamPolicy },
        qchat: { policy: qchatPolicy },
      };

      ctx.cfg = {
        ...ctx.cfg,
        channels: {
          ...ctx.cfg.channels,
          nim: {
            instances: [{
              enabled: true,
              appKey: fetchedConfig.appKey,
              account: fetchedConfig.account,
              token: fetchedConfig.token,
              p2p: { policy: p2pPolicy },
              team: { policy: teamPolicy },
              qchat: { policy: qchatPolicy },
            }],
          } as any,
        },
      };

      // === Step 6: 设置 accountId ===
      (ctx as any).accountId = accountId;
      logger.step(6, STEPS, `ctx.accountId 已设置为: ${accountId}`);

      // === Step 7: 委托 openclaw-nim 启动连接 ===
      logger.step(7, STEPS, "委托 openclaw-nim 启动 NIM 连接...");
      ctx.log?.info(`[nim-yx-auth] Delegating to openclaw-nim (accountId: ${accountId})`);

      if (!nimPlugin.gateway?.startAccount) {
        logger.error("START", "nimPlugin.gateway.startAccount 不存在！");
        logger.error("START", "nimPlugin.gateway keys:", Object.keys(nimPlugin.gateway || {}));
        throw new Error("[nim-yx-auth] nimPlugin.gateway.startAccount is not available");
      }

      try {
        const result = await nimPlugin.gateway.startAccount(ctx);
        logger.step(8, STEPS, "openclaw-nim 启动完成 ✅");
        logger.info("START", "NIM YX Auth 插件启动成功 ✅");
        return result;
      } catch (err: any) {
        logger.error("START", "openclaw-nim 启动失败:", err.message);
        logger.error("START", "错误堆栈:", err.stack);
        throw err;
      }
    },
  },

  reload: { configPrefixes: ["channels.nim"] },
};

export default nimYxAuthPlugin;
