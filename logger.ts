/**
 * NIM YX Auth - 日志模块
 *
 * 同时输出到 console 和文件（/var/log/supervisor/nim-yx-auth.log）
 * 容器环境下 supervisor 会收集 /var/log/supervisor/ 下的日志
 */

import * as fs from "node:fs";
import * as path from "node:path";

const LOG_DIR = "/var/log/supervisor";
const LOG_FILE = path.join(LOG_DIR, "nim-yx-auth.log");

let fileReady = false;

function ensureLogFile() {
  if (fileReady) return;
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    // 测试写权限
    fs.appendFileSync(LOG_FILE, "");
    fileReady = true;
  } catch {
    // 写不了就只走 console
  }
}

function timestamp(): string {
  return new Date().toISOString();
}

function writeToFile(msg: string) {
  try {
    fs.appendFileSync(LOG_FILE, msg + "\n");
  } catch {
    // 静默失败
  }
}

function formatMsg(level: string, tag: string, ...parts: unknown[]): string {
  const text = parts.map((p) =>
    typeof p === "string" ? p : JSON.stringify(p, null, 2)
  ).join(" ");
  return `${timestamp()} [${level}] [${tag}] ${text}`;
}

function log(level: "INFO" | "WARN" | "ERROR" | "DEBUG", tag: string, ...parts: unknown[]) {
  ensureLogFile();
  const msg = formatMsg(level, tag, ...parts);

  // console 输出
  const consoleFn = level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;
  consoleFn(msg);

  // 文件输出
  writeToFile(msg);
}

export const logger = {
  info: (tag: string, ...parts: unknown[]) => log("INFO", tag, ...parts),
  warn: (tag: string, ...parts: unknown[]) => log("WARN", tag, ...parts),
  error: (tag: string, ...parts: unknown[]) => log("ERROR", tag, ...parts),
  debug: (tag: string, ...parts: unknown[]) => log("DEBUG", tag, ...parts),

  /** 记录步骤，带序号 */
  step: (stepNum: number, total: number, msg: string) => {
    log("INFO", "STEP", `[${stepNum}/${total}] ${msg}`);
  },
};
