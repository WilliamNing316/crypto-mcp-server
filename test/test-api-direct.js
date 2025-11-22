#!/usr/bin/env node

/**
 * 直接测试 Binance API（不通过 MCP 服务器）
 * 用于验证网络连接和 API 可用性
 */

async function testBinanceAPI() {
  console.log('='.repeat(80));
  console.log('直接测试 Binance API');
  console.log('='.repeat(80));
  console.log('');

  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

  // 测试 1: 价格查询
  console.log('1. 测试价格查询 API (/ticker/price)\n');
  for (const symbol of symbols) {
    try {
      const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
      console.log(`测试 ${symbol}...`);
      
      const startTime = Date.now();
      const response = await fetch(url);
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        console.log(`  ❌ 错误: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`  ✅ 成功 (延迟: ${latency}ms)`);
      console.log(`  价格: ${data.price} ${symbol}`);
      console.log('');
    } catch (error) {
      console.log(`  ❌ 异常: ${error.message}`);
      console.log('');
    }
  }

  // 测试 2: 24小时统计数据
  console.log('\n2. 测试24小时统计数据 API (/ticker/24hr)\n');
  for (const symbol of symbols) {
    try {
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
      console.log(`测试 ${symbol}...`);
      
      const startTime = Date.now();
      const response = await fetch(url);
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        console.log(`  ❌ 错误: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`  ✅ 成功 (延迟: ${latency}ms)`);
      console.log(`  价格变化: ${data.priceChange} (${data.priceChangePercent}%)`);
      console.log(`  当前价格: ${data.lastPrice}`);
      console.log(`  最高价: ${data.highPrice}`);
      console.log(`  最低价: ${data.lowPrice}`);
      console.log(`  成交量: ${data.volume}`);
      console.log(`  成交额: ${data.quoteVolume}`);
      console.log('');
    } catch (error) {
      console.log(`  ❌ 异常: ${error.message}`);
      console.log('');
    }
  }

  // 测试 3: K线数据
  console.log('\n3. 测试K线数据 API (/klines)\n');
  const intervals = ['1h', '15m', '1d'];
  for (const symbol of symbols.slice(0, 2)) { // 只测试前两个，避免太多输出
    for (const interval of intervals) {
      try {
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=5`;
        console.log(`测试 ${symbol} (${interval}, 5条)...`);
        
        const startTime = Date.now();
        const response = await fetch(url);
        const latency = Date.now() - startTime;
        
        if (!response.ok) {
          console.log(`  ❌ 错误: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const data = await response.json();
        console.log(`  ✅ 成功 (延迟: ${latency}ms)`);
        console.log(`  返回K线数量: ${data.length}`);
        if (data.length > 0) {
          const kline = data[0];
          console.log(`  最新K线:`);
          console.log(`    时间: ${new Date(kline[0]).toISOString()}`);
          console.log(`    开盘: ${kline[1]}, 最高: ${kline[2]}, 最低: ${kline[3]}, 收盘: ${kline[4]}`);
          console.log(`    成交量: ${kline[5]}`);
        }
        console.log('');
      } catch (error) {
        console.log(`  ❌ 异常: ${error.message}`);
        console.log('');
      }
    }
  }

  // 测试 4: 订单簿（交易深度）
  console.log('\n4. 测试订单簿 API (/depth)\n');
  for (const symbol of symbols.slice(0, 2)) { // 只测试前两个
    try {
      const url = `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`;
      console.log(`测试 ${symbol}...`);
      
      const startTime = Date.now();
      const response = await fetch(url);
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        console.log(`  ❌ 错误: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`  ✅ 成功 (延迟: ${latency}ms)`);
      console.log(`  买盘数量: ${data.bids.length}, 卖盘数量: ${data.asks.length}`);
      if (data.bids.length > 0 && data.asks.length > 0) {
        const bestBid = parseFloat(data.bids[0][0]);
        const bestAsk = parseFloat(data.asks[0][0]);
        const spread = bestAsk - bestBid;
        const spreadPercent = (spread / bestBid) * 100;
        console.log(`  最佳买价: ${bestBid}, 最佳卖价: ${bestAsk}`);
        console.log(`  价差: ${spread.toFixed(8)} (${spreadPercent.toFixed(4)}%)`);
        
        // 计算买卖盘总量
        const bidTotal = data.bids.reduce((sum, [price, qty]) => sum + parseFloat(price) * parseFloat(qty), 0);
        const askTotal = data.asks.reduce((sum, [price, qty]) => sum + parseFloat(price) * parseFloat(qty), 0);
        console.log(`  买盘总量: ${bidTotal.toFixed(2)}, 卖盘总量: ${askTotal.toFixed(2)}`);
      }
      console.log('');
    } catch (error) {
      console.log(`  ❌ 异常: ${error.message}`);
      console.log('');
    }
  }

  console.log('API 测试完成');
}

testBinanceAPI().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});

