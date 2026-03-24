/**
 * NIM YX Auth - 认证模块
 *
 * 调用 Auth 接口获取凭证和权限开关
 * authUrl 优先使用配置，未配置则使用默认值
 */

import type { NimAuthConfig, AuthResponse, FetchedConfig } from "./types.js";

/**
 * 默认 Auth 接口地址
 * 
 * 部署时修改此默认值，用户也可以通过配置覆盖
 */
const DEFAULT_AUTH_URL = "https://api.yun.tilldream.com/api/im/im";

/**
 * 从 Auth 接口获取 NIM 凭证和权限开关
 */
export async function fetchNimConfig(
  config: NimAuthConfig
): Promise<FetchedConfig> {
  const { appId, appSecret, authUrl } = config;

  // 优先使用配置的 authUrl，未配置则使用默认值
  const baseUrl = authUrl || DEFAULT_AUTH_URL;

  const url = `${baseUrl}/openClaw/auth`;

  console.log(`[nim-yx-auth] Fetching config from: ${baseUrl}`);

  // POST + JSON Body
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ appId, appSecret }),
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
 */
export function validateAuthConfig(config: NimAuthConfig): string | null {
  if (!config.appId) return "appId is required";
  if (!config.appSecret) return "appSecret is required";
  return null;
}