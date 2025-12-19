#!/usr/bin/env node

/**
 * 简单的 Agent 来调用 MCP 服务器
 * 使用 LLM API (https://llmapi.paratera.com) 来决策和执行 MCP 工具调用
 */

// 使用 Node.js 18+ 原生 fetch（无需额外依赖）
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { CONFIG } from './config.js';

/**
 * 调用 MCP 服务器
 */
async function callMcpServer(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  };

  // 调试日志（仅在开发时启用）
  if (process.env.DEBUG) {
    console.log(`[DEBUG] MCP 请求:`, JSON.stringify(request, null, 2));
  }

  try {
    const response = await fetch(CONFIG.MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      // 尝试读取错误响应体
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {
        errorBody = '无法读取错误响应';
      }
      throw new Error(`MCP 服务器错误: ${response.status} ${response.statusText}\n响应体: ${errorBody}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`MCP 错误: ${JSON.stringify(data.error, null, 2)}`);
    }

    return data.result;
  } catch (error) {
    throw new Error(`调用 MCP 服务器失败: ${error.message}`);
  }
}

/**
 * 获取 MCP 工具列表
 */
async function listTools() {
  return await callMcpServer('tools/list');
}

/**
 * 调用 MCP 工具
 */
async function callTool(name, args) {
  return await callMcpServer('tools/call', {
    name,
    arguments: args,
  });
}

/**
 * 调用 LLM API
 */
async function callLLM(messages, tools = null) {
  const url = `${CONFIG.LLM_API_URL}/v1/chat/completions`;
  
  const body = {
    model: CONFIG.MODEL,
    messages,
    temperature: 0.7,
  };

  // 如果提供了工具，添加到请求中
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  // 如果有 API key，添加到 headers
  if (CONFIG.LLM_API_KEY) {
    headers['Authorization'] = `Bearer ${CONFIG.LLM_API_KEY}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API 错误: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`调用 LLM API 失败: ${error.message}`);
  }
}

/**
 * 将 MCP 工具格式转换为 OpenAI 工具格式
 */
function convertMcpToolsToOpenAI(mcpTools) {
  return mcpTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

/**
 * 执行工具调用
 */
async function executeToolCall(toolCall) {
  const { name, arguments: argsRaw } = toolCall.function;
  
  // 处理参数：如果 LLM 返回的是字符串，需要解析为对象
  let args = argsRaw;
  if (typeof argsRaw === 'string') {
    try {
      args = JSON.parse(argsRaw);
    } catch (e) {
      throw new Error(`无法解析工具参数: ${argsRaw}`);
    }
  }
  
  console.log(`\n[执行工具] ${name}`);
  console.log(`  参数:`, JSON.stringify(args, null, 2));
  
  try {
    const result = await callTool(name, args);
    
    // 提取工具返回的文本内容
    let toolResult = '';
    if (result.content && result.content.length > 0) {
      toolResult = result.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
    } else {
      toolResult = JSON.stringify(result, null, 2);
    }
    
    console.log(`  结果:`, toolResult.substring(0, 200) + (toolResult.length > 200 ? '...' : ''));
    
    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      content: toolResult,
    };
  } catch (error) {
    console.error(`  错误:`, error.message);
    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      content: `错误: ${error.message}`,
    };
  }
}

/**
 * 主 Agent 函数
 */
async function runAgent(userQuery) {
  console.log('='.repeat(80));
  console.log('Crypto MCP Agent');
  console.log('='.repeat(80));
  console.log(`\n用户问题: ${userQuery}\n`);

  try {
    // 1. 获取 MCP 工具列表
    console.log('[步骤 1] 获取 MCP 工具列表...');
    const toolsResult = await listTools();
    const mcpTools = toolsResult.tools || [];
    console.log(`  找到 ${mcpTools.length} 个工具:`);
    mcpTools.forEach(tool => {
      console.log(`    - ${tool.name}: ${tool.description}`);
    });

    // 2. 转换为 OpenAI 工具格式
    const openAITools = convertMcpToolsToOpenAI(mcpTools);

    // 3. 初始化对话消息
    const messages = [
      {
        role: 'system',
        content: `你是一个加密货币市场分析助手。你可以使用以下工具来获取实时市场数据：
${mcpTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

请根据用户的问题，选择合适的工具来获取数据，然后基于数据给出分析和回答。`,
      },
      {
        role: 'user',
        content: userQuery,
      },
    ];

    // 4. 开始对话循环（最多 10 轮工具调用）
    let maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n[步骤 ${iteration + 1}] 调用 LLM...`);

      // 调用 LLM
      const llmResponse = await callLLM(messages, openAITools);
      
      const choice = llmResponse.choices[0];
      const message = choice.message;

      // 调试信息：显示 LLM 的响应
      if (process.env.DEBUG) {
        console.log(`[DEBUG] LLM 响应:`, JSON.stringify({
          hasToolCalls: !!message.tool_calls,
          toolCallsCount: message.tool_calls?.length || 0,
          hasContent: !!message.content,
          contentPreview: message.content?.substring(0, 100) || '无内容'
        }, null, 2));
      }

      // 添加 LLM 的回复到消息历史
      messages.push(message);

      // 检查是否有工具调用
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`  LLM 决定调用 ${message.tool_calls.length} 个工具`);
        
        // 执行所有工具调用
        const toolResults = await Promise.all(
          message.tool_calls.map(toolCall => executeToolCall(toolCall))
        );

        // 将工具结果添加到消息历史
        messages.push(...toolResults);
        
        // 如果已经执行了工具调用，下一次循环时强制 LLM 给出最终答案
        // 通过设置 tool_choice 为 'none' 来避免无限循环
        if (iteration >= maxIterations - 1) {
          console.log(`\n[警告] 即将达到最大迭代次数，最后一次调用将强制 LLM 给出最终答案`);
        }
      } else {
        // 没有工具调用，LLM 已经给出最终答案
        if (message.content) {
          console.log('\n[最终回答]');
          console.log('='.repeat(80));
          console.log(message.content);
          console.log('='.repeat(80));
          return message.content;
        } else {
          console.warn('\n[警告] LLM 返回的消息没有内容，尝试继续...');
          // 如果消息没有内容也没有工具调用，可能是格式问题，继续循环
        }
      }
    }

    // 如果达到最大迭代次数，尝试最后一次调用（不使用工具）
    console.log('\n[信息] 达到最大迭代次数，最后一次调用 LLM（不使用工具）...');
    const finalResponse = await callLLM(messages, null); // 不提供工具，强制 LLM 给出答案
    const finalMessage = finalResponse.choices[0].message;
    
    if (finalMessage.content) {
      console.log('\n[最终回答] (达到最大迭代次数后强制生成)');
      console.log('='.repeat(80));
      console.log(finalMessage.content);
      console.log('='.repeat(80));
      return finalMessage.content;
    }

    // 如果还是没有内容，返回错误
    throw new Error('达到最大迭代次数，LLM 未能生成最终答案');
  } catch (error) {
    console.error('\n[错误]', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法: node agent.js "你的问题"');
    console.log('\n示例:');
    console.log('  node agent.js "BTC 现在多少钱？"');
    console.log('  node agent.js "ETH 今天涨了多少？"');
    console.log('  node agent.js "BTC 的买卖盘深度怎么样？"');
    console.log('\n环境变量:');
    console.log('  LLM_API_URL - LLM API 地址 (默认: https://llmapi.paratera.com)');
    console.log('  LLM_API_KEY - LLM API Key (可选)');
    console.log('  MCP_SERVER_URL - MCP 服务器地址 (默认: http://localhost:8081/mcp)');
    console.log('  MODEL - LLM 模型名称 (默认: gpt-3.5-turbo)');
    process.exit(1);
  }

  const userQuery = args.join(' ');
  
  try {
    await runAgent(userQuery);
  } catch (error) {
    console.error('Agent 执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本（通过 node agent.js 运行）
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && resolve(process.argv[1]) === __filename;

if (isMainModule) {
  main();
}

export { runAgent, callMcpServer, callLLM };
