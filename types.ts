/**
 * NIM YX Auth - Type Definitions
 *
 * 支持两种认证方式：
 * 1. appId + appSecret（原有方式）
 * 2. authToken（新增方式）
 */

/**
 * 用户配置的认证信息
 */
export interface NimAuthConfig {
  /** 是否启用 */
  enabled?: boolean;

  /** 用户申请的 App ID */
  appId?: string;

  /** 用户申请的密钥 */
  appSecret?: string;

  /** Auth Token（新增，优先使用） */
  authToken?: string;

  /** Auth 接口地址（可选，不配则使用默认值） */
  authUrl?: string;

  /** 昵称（可选） */
  nickName?: string;
}

/**
 * 认证接口响应 - 服务端返回凭证和开关配置
 */
export interface AuthResponse {
  code: number;
  msg: string;
  currentTime: number;
  data: {
    // 核心凭证
    appKey: string;
    robotAccid: string;    // 注意: API 返回的是 robotAccid
    robotToken: string;

    // 权限开关
    enableP2P?: boolean;     // 是否允许单聊
    enableTeam?: boolean;    // 是否允许群聊
    enableQChat?: boolean;   // 是否允许圈组
    enableAddFriend?: boolean;
    enableJoinTeam?: boolean;
  };
}

/**
 * 获取到的完整配置（服务端完全控制）
 */
export interface FetchedConfig {
  appKey: string;
  account: string;   // robotAccId
  token: string;     // robotToken
  enableP2P: boolean;
  enableTeam: boolean;
  enableQChat: boolean;
}
