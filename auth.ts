/**
 * NIM YX Auth - 认证模块
 *
 * 支持两种认证方式：
 * 1. authToken（优先）- 直接使用 token 认证
 * 2. appId + appSecret - 原有方式
 *
 * 请求参数根据配置的值来决定，有什么值就带什么请求
 */

import type { NimAuthConfig, AuthResponse, FetchedConfig } from "./types.js";
import { logger } from "./logger.js";

/**
 * 默认 Auth 接口地址
 *
 * 部署时修改此默认值，用户也可以通过配置覆盖
 */
const DEFAULT_AUTH_URL = "https://api.yun.tilldream.com/api/im";

/**
 * 从 Auth 接口获取 NIM 凭证和权限开关
 */
export async function fetchNimConfig(
  config: NimAuthConfig
): Promise<FetchedConfig> {
  const { appId, appSecret, authToken, authUrl, nickName } = config;

  // 优先使用配置的 authUrl，未配置则使用默认值
  const baseUrl = authUrl || DEFAULT_AUTH_URL;
  const url = `${baseUrl}/openClaw/auth`;

  logger.info("AUTH", `请求地址: ${url}`);

  // 构建请求参数 - 有什么值就带什么
  const requestBody: Record<string, string> = {};

  if (authToken) {
    requestBody.authToken = authToken;
    logger.info("AUTH", `认证方式: authToken (${authToken.substring(0, 8)}...)`);
  }

  if (appId) {
    requestBody.appId = appId;
  }

  if (appSecret) {
    requestBody.appSecret = appSecret;
  }

  if (appId && appSecret && !authToken) {
    logger.info("AUTH", `认证方式: appId (${appId}) + appSecret`);
  }

  if (nickName) {
    requestBody.nickName = nickName;
    logger.info("AUTH", `昵称: ${nickName}`);
  }

  logger.debug("AUTH", "请求参数:", Object.keys(requestBody));

  // POST + JSON Body
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  logger.info("AUTH", `HTTP 响应: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const err = `HTTP ${response.status}: ${response.statusText}`;
    logger.error("AUTH", `请求失败: ${err}`);
    throw new Error(err);
  }

  const data: AuthResponse = await response.json();
  logger.info("AUTH", `Auth 接口返回 code: ${data.code}, msg: ${data.msg}`);

  if (data.code !== 0) {
    const err = `Auth failed: ${data.msg} (code: ${data.code})`;
    logger.error("AUTH", err);
    throw new Error(err);
  }

  const { appKey, robotAccid, robotToken } = data.data;

  if (!appKey || !robotAccid || !robotToken) {
    const err = "Invalid response: missing required fields (appKey/robotAccid/robotToken)";
    logger.error("AUTH", err);
    logger.error("AUTH", "响应数据:", data.data);
    throw new Error(err);
  }

  logger.info("AUTH", `凭证获取成功: appKey=${appKey}, account=${robotAccid}, token=${robotToken.substring(0, 8)}...`);
  logger.info("AUTH", `权限开关: P2P=${data.data.enableP2P ?? true}, Team=${data.data.enableTeam ?? true}, QChat=${data.data.enableQChat ?? false}`);

  return {
    appKey,
    account: robotAccid,
    token: robotToken,
    enableP2P: data.data.enableP2P ?? true,
    enableTeam: data.data.enableTeam ?? true,
    enableQChat: data.data.enableQChat ?? false,
  };
}

/**
 * 验证用户配置
 *
 * 支持两种认证方式（二选一）：
 * 1. authToken
 * 2. appId + appSecret
 */
export function validateAuthConfig(config: NimAuthConfig): string | null {
  // 方式1: 使用 authToken
  if (config.authToken) {
    return null;
  }

  // 方式2: 使用 appId + appSecret
  if (config.appId && config.appSecret) {
    return null;
  }

  // 两种方式都没有满足
  if (!config.appId && !config.authToken) {
    return "appId or authToken is required";
  }

  if (config.appId && !config.appSecret) {
    return "appSecret is required when using appId";
  }

  return "Invalid configuration: provide either authToken or (appId + appSecret)";
}
