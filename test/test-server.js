#!/usr/bin/env node

/**
 * 命令行测试脚本 - 用于服务器环境测试 MCP 服务器
 * 无需浏览器，直接通过 stdio 与服务器通信
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MCP 协议消息 ID 计数器
let messageId = 1;

/**
 * 发送 MCP 请求
 */
function sendRequest(process, method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: messageId++,
    method,
    params,
  };
  
  const message = JSON.stringify(request) + '\n';
  process.stdin.write(message);
  console.log(`[发送] ${method}:`, JSON.stringify(params, null, 2));
}

/**
 * 测试流程
 */
async function testServer() {
  console.log('='.repeat(80));
  console.log('MCP 服务器测试（命令行模式）');
  console.log('='.repeat(80));
  console.log('');

  // 启动服务器进程
  const serverPath = join(__dirname, '../dist/server.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // 收集输出
  let outputBuffer = '';
  let errorBuffer = '';

  server.stdout.on('data', (data) => {
    outputBuffer += data.toString();
    // 尝试解析 JSON 消息（MCP 使用换行符分隔的 JSON）
    const lines = outputBuffer.split('\n');
    outputBuffer = lines.pop() || ''; // 保留最后不完整的行
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          handleResponse(response);
        } catch (e) {
          // 忽略非 JSON 行
        }
      }
    }
  });

  server.stderr.on('data', (data) => {
    errorBuffer += data.toString();
    const lines = errorBuffer.split('\n');
    errorBuffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        console.log(`[服务器日志] ${line}`);
      }
    }
  });

  server.on('close', (code) => {
    console.log(`\n[服务器退出] 退出码: ${code}`);
    process.exit(code || 0);
  });

  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('1. 测试列出工具...\n');
  sendRequest(server, 'tools/list');

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n2. 测试获取 BTC 价格...\n');
  sendRequest(server, 'tools/call', {
    name: 'get_price',
    arguments: {
      symbol: 'BTC',
      quote: 'USDT',
    },
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n3. 测试获取 ETH 价格...\n');
  sendRequest(server, 'tools/call', {
    name: 'get_price',
    arguments: {
      symbol: 'ETH',
      quote: 'USDT',
    },
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n4. 测试获取 SOL 价格...\n');
  sendRequest(server, 'tools/call', {
    name: 'get_price',
    arguments: {
      symbol: 'SOL',
      quote: 'USDT',
    },
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n5. 测试获取 BTC 24小时统计数据...\n');
  sendRequest(server, 'tools/call', {
    name: 'get_24h_stats',
    arguments: {
      symbol: 'BTC',
      quote: 'USDT',
    },
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n6. 测试获取 ETH 24小时统计数据...\n');
  sendRequest(server, 'tools/call', {
    name: 'get_24h_stats',
    arguments: {
      symbol: 'ETH',
      quote: 'USDT',
    },
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n7. 测试获取 BTC K线数据（1小时，10条）...\n');
  sendRequest(server, 'tools/call', {
    name: 'get_ohlcv',
    arguments: {
      symbol: 'BTC',
      quote: 'USDT',
      interval: '1h',
      limit: 10,
    },
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n8. 测试获取 ETH K线数据（15分钟，5条）...\n');
  sendRequest(server, 'tools/call', {
    name: 'get_ohlcv',
    arguments: {
      symbol: 'ETH',
      quote: 'USDT',
      interval: '15m',
      limit: 5,
    },
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n9. 测试获取 BTC 综合概览...\n');
  sendRequest(server, 'tools/call', {
    name: 'get_symbol_overview',
    arguments: {
      symbol: 'BTC',
      quote: 'USDT',
    },
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n10. 测试获取 ETH 综合概览...\n');
  sendRequest(server, 'tools/call', {
    name: 'get_symbol_overview',
    arguments: {
      symbol: 'ETH',
      quote: 'USDT',
    },
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n11. 测试获取 BTC 订单簿（深度）...\n');
  sendRequest(server, 'tools/call', {
    name: 'get_order_book',
    arguments: {
      symbol: 'BTC',
      quote: 'USDT',
      limit: 20,
    },
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n12. 测试获取 ETH 订单簿（深度）...\n');
  sendRequest(server, 'tools/call', {
    name: 'get_order_book',
    arguments: {
      symbol: 'ETH',
      quote: 'USDT',
      limit: 20,
    },
  });

  // 等待响应后关闭
  setTimeout(() => {
    console.log('\n测试完成，关闭服务器...');
    server.kill();
  }, 7000);
}

/**
 * 处理服务器响应
 */
function handleResponse(response) {
  if (response.error) {
    console.log(`[错误] ID ${response.id}:`, response.error);
    return;
  }

  if (response.result) {
    console.log(`[响应] ID ${response.id}:`);
    
    if (response.result.tools) {
      // tools/list 响应
      console.log('可用工具:');
      response.result.tools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
    } else if (response.result.content) {
      // tools/call 响应
      response.result.content.forEach(item => {
        if (item.type === 'text') {
          try {
            const data = JSON.parse(item.text);
            
            // 根据数据结构判断工具类型
            if (data.price !== undefined) {
              // get_price 响应
            console.log('价格信息:');
            console.log(`  交易对: ${data.symbol}`);
            console.log(`  价格: ${data.price} ${data.quote}`);
            console.log(`  时间戳: ${data.timestamp} (${data.timestampISO})`);
            } else if (data.priceChange !== undefined) {
              // get_24h_stats 响应
              console.log('24小时统计数据:');
              console.log(`  交易对: ${data.symbol}`);
              console.log(`  价格变化: ${data.priceChange} (${data.priceChangePercent}%)`);
              console.log(`  当前价格: ${data.lastPrice}`);
              console.log(`  最高价: ${data.highPrice}`);
              console.log(`  最低价: ${data.lowPrice}`);
              console.log(`  开盘价: ${data.openPrice}`);
              console.log(`  成交量: ${data.volume}`);
              console.log(`  成交额: ${data.quoteVolume}`);
              console.log(`  加权平均价: ${data.weightedAvgPrice}`);
            } else if (data.klines !== undefined) {
              // get_ohlcv 响应
              console.log('K线数据:');
              console.log(`  交易对: ${data.symbol}`);
              console.log(`  时间间隔: ${data.interval}`);
              console.log(`  返回数量: ${data.count}`);
              console.log(`  前3条K线数据:`);
              data.klines.slice(0, 3).forEach((kline, idx) => {
                console.log(`    K线 ${idx + 1}:`);
                console.log(`      时间: ${kline.openTimeISO}`);
                console.log(`      开盘: ${kline.open}, 最高: ${kline.high}, 最低: ${kline.low}, 收盘: ${kline.close}`);
                console.log(`      成交量: ${kline.volume}`);
              });
            } else if (data.trend !== undefined) {
              // get_symbol_overview 响应
              console.log('交易对综合概览:');
              console.log(`  交易对: ${data.symbol}`);
              console.log(`  当前价格: ${data.currentPrice}`);
              console.log(`  24小时涨跌: ${data.priceChange24h} (${data.priceChangePercent24h}%)`);
              console.log(`  24小时最高: ${data.high24h}, 最低: ${data.low24h}`);
              console.log(`  24小时成交量: ${data.volume24h}`);
              console.log(`  24小时成交额: ${data.quoteVolume24h}`);
              console.log(`  趋势判断: ${data.trend.trend} (强度: ${data.trend.trendStrength.toFixed(2)})`);
              console.log(`  趋势描述: ${data.trend.description}`);
              if (data.trend.indicators) {
                console.log(`  技术指标:`);
                if (data.trend.indicators.ma5) console.log(`    MA5: ${data.trend.indicators.ma5.toFixed(2)}`);
                if (data.trend.indicators.ma10) console.log(`    MA10: ${data.trend.indicators.ma10.toFixed(2)}`);
                if (data.trend.indicators.ma20) console.log(`    MA20: ${data.trend.indicators.ma20.toFixed(2)}`);
                console.log(`    RSI: ${data.trend.indicators.rsi.toFixed(1)}`);
                console.log(`    价格变化: ${data.trend.indicators.priceChange.toFixed(2)} (${data.trend.indicators.priceChangePercent >= 0 ? '+' : ''}${data.trend.indicators.priceChangePercent.toFixed(2)}%)`);
              }
              console.log(`  交易量分析: ${data.volumeAnalysis.volumeLevel} - ${data.volumeAnalysis.description}`);
            } else if (data.bestBid !== undefined) {
              // get_order_book 响应
              console.log('订单簿（交易深度）:');
              console.log(`  交易对: ${data.symbol}`);
              console.log(`  最佳买价: ${data.bestBid}`);
              console.log(`  最佳卖价: ${data.bestAsk}`);
              console.log(`  价差: ${data.spread} (${data.spreadPercent}%)`);
              console.log(`  买卖盘比例: ${data.bidAskRatio}`);
              console.log(`  买盘强度: ${data.liquidity.bidStrength}`);
              console.log(`  买盘总量: ${data.liquidity.bidTotal}, 卖盘总量: ${data.liquidity.askTotal}`);
              console.log(`  总流动性: ${data.liquidity.totalLiquidity}`);
              console.log(`  前5档买盘:`);
              data.topBids.slice(0, 5).forEach((bid, idx) => {
                console.log(`    ${idx + 1}. 价格: ${bid.price}, 数量: ${bid.quantity}, 总额: ${bid.total}`);
              });
              console.log(`  前5档卖盘:`);
              data.topAsks.slice(0, 5).forEach((ask, idx) => {
                console.log(`    ${idx + 1}. 价格: ${ask.price}, 数量: ${ask.quantity}, 总额: ${ask.total}`);
              });
            } else {
              // 未知格式，直接输出
              console.log('响应数据:', JSON.stringify(data, null, 2));
            }
          } catch (e) {
            console.log('  原始文本:', item.text);
          }
        }
      });
    } else {
      console.log(JSON.stringify(response.result, null, 2));
    }
  }
  
  console.log('');
}

// 运行测试
testServer().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});

