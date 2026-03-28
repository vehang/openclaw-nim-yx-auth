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

  console.log(`[nim-yx-auth] Fetching config from: ${baseUrl}`);

  // 构建请求参数 - 有什么值就带什么
  const requestBody: Record<string, string> = {};
  
  if (authToken) {
    requestBody.authToken = authToken;
    console.log(`[nim-yx-auth] Using authToken authentication`);
  }
  
  if (appId) {
    requestBody.appId = appId;
  }
  
  if (appSecret) {
    requestBody.appSecret = appSecret;
  }
  
  if (nickName) {
    requestBody.nickName = nickName;
    console.log(`[nim-yx-auth] Using nickName: ${nickName}`);
  }

  // 判断使用哪种认证方式的日志
  if (authToken) {
    console.log(`[nim-yx-auth] Auth method: authToken`);
  } else if (appId && appSecret) {
    console.log(`[nim-yx-auth] Auth method: appId + appSecret`);
  }

  // POST + JSON Body
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: AuthResponse = await response.json();

  if (data.code !== 0) {
    throw new Error(`Auth failed: ${data.msg} (code: ${data.code})`);
  }

  const { appKey, robotAccid, robotToken } = data.data;

  if (!appKey || !robotAccid || !robotToken) {
    throw new Error("Invalid response: missing required fields");
  }

  console.log(`[nim-yx-auth] Config fetched - account: ${robotAccid}`);
  console.log(`[nim-yx-auth] P2P: ${data.data.enableP2P ?? true ? 'ON' : 'OFF'}`);
  console.log(`[nim-yx-auth] Team: ${data.data.enableTeam ?? true ? 'ON' : 'OFF'}`);
  console.log(`[nim-yx-auth] QChat: ${data.data.enableQChat ?? false ? 'ON' : 'OFF'}`);

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
    return null; // authToken 存在，验证通过
  }
  
  // 方式2: 使用 appId + appSecret
  if (config.appId && config.appSecret) {
    return null; // appId + appSecret 都存在，验证通过
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
