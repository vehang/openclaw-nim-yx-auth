/**
 * NIM YX Auth Extension - 入口文件
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { nimYxAuthPlugin } from "./channel.ts";
import { logger } from "./logger.js";

// 从 openclaw-nim 的源码导入 setNimRuntime
import { setNimRuntime } from "openclaw-nim/src/runtime.js";

const plugin = {
  id: "nim",
  name: "NIM YX Auth",
  description: "网易云信 IM 安全认证插件",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    logger.info("INIT", "插件模块加载开始");
    logger.info("INIT", "openclaw runtime:", {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    });

    try {
      // 初始化 NIM runtime（关键！）
      logger.info("INIT", "设置 NIM runtime...");
      setNimRuntime(api.runtime);
      logger.info("INIT", "NIM runtime 设置成功");
    } catch (err) {
      logger.error("INIT", "NIM runtime 设置失败:", err);
      throw err;
    }

    // 注册 channel
    try {
      logger.info("INIT", "注册 NIM channel 插件...");
      api.registerChannel({ plugin: nimYxAuthPlugin });
      logger.info("INIT", "NIM channel 插件注册成功 ✅");
    } catch (err) {
      logger.error("INIT", "NIM channel 插件注册失败:", err);
      throw err;
    }

    logger.info("INIT", "插件初始化完成");
  },
};

export default plugin;

export { nimYxAuthPlugin };
export * from "./types.ts";
export * from "./auth.ts";
