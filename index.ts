/**
 * NIM YX Auth Extension - 入口文件
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { nimYxAuthPlugin } from "./channel.ts";

// 从 openclaw-nim 的源码导入 setNimRuntime
import { setNimRuntime } from "openclaw-nim/src/runtime.js";

const plugin = {
  id: "nim",
  name: "NIM YX Auth",
  description: "网易云信 IM 安全认证插件",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    // 初始化 NIM runtime（关键！）
    setNimRuntime(api.runtime);
    // 注册 channel
    api.registerChannel({ plugin: nimYxAuthPlugin });
  },
};

export default plugin;

export { nimYxAuthPlugin };
export * from "./types.ts";
export * from "./auth.ts";
