/**
 * Agent 配置文件
 * 从 config.json 文件读取配置
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 默认配置
const DEFAULT_CONFIG = {
  LLM_API_URL: 'https://llmapi.paratera.com',
  LLM_API_KEY: '',
  MCP_SERVER_URL: 'http://localhost:8081/mcp',
  MODEL: 'gpt-3.5-turbo',
};

// 尝试读取配置文件
let configFile = null;
const configPath = join(__dirname, 'config.json');

try {
  const configContent = readFileSync(configPath, 'utf-8');
  configFile = JSON.parse(configContent);
  console.log(`[配置] 已从 ${configPath} 加载配置`);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.warn(`[配置] 配置文件 ${configPath} 不存在，使用默认配置`);
    console.warn(`[配置] 请复制 config.json.example 为 config.json 并填入你的配置`);
  } else {
    console.error(`[配置] 读取配置文件失败: ${error.message}`);
    console.warn(`[配置] 使用默认配置`);
  }
}

// 合并配置：配置文件 > 默认配置
export const CONFIG = {
  LLM_API_URL: configFile?.LLM_API_URL || DEFAULT_CONFIG.LLM_API_URL,
  LLM_API_KEY: configFile?.LLM_API_KEY || DEFAULT_CONFIG.LLM_API_KEY,
  MCP_SERVER_URL: configFile?.MCP_SERVER_URL || DEFAULT_CONFIG.MCP_SERVER_URL,
  MODEL: configFile?.MODEL || DEFAULT_CONFIG.MODEL,
};

// 验证配置
if (!CONFIG.LLM_API_URL) {
  console.warn('警告: LLM_API_URL 未设置，使用默认值');
}

if (!CONFIG.LLM_API_KEY) {
  console.warn('警告: LLM_API_KEY 未设置，某些 API 可能需要认证');
}
