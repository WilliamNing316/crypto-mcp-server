#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// 工具输入参数 Schema
const GetPriceSchema = z.object({
  symbol: z.string().describe("交易对符号，如 BTC、ETH、SOL（不区分大小写）"),
  quote: z.string().optional().default("USDT").describe("报价货币，如 USDT、BUSD（默认 USDT）"),
});

const Get24hStatsSchema = z.object({
  symbol: z.string().describe("交易对符号，如 BTC、ETH、SOL（不区分大小写）"),
  quote: z.string().optional().default("USDT").describe("报价货币，如 USDT、BUSD（默认 USDT）"),
});

const GetOhlcvSchema = z.object({
  symbol: z.string().describe("交易对符号，如 BTC、ETH、SOL（不区分大小写）"),
  quote: z.string().optional().default("USDT").describe("报价货币，如 USDT、BUSD（默认 USDT）"),
  interval: z.enum(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"]).optional().default("1h").describe("K线时间间隔，如 1m, 5m, 1h, 1d（默认 1h）"),
  limit: z.number().int().min(1).max(1000).optional().default(500).describe("返回的K线数量（1-1000，默认500）"),
});

const GetSymbolOverviewSchema = z.object({
  symbol: z.string().describe("交易对符号，如 BTC、ETH、SOL（不区分大小写）"),
  quote: z.string().optional().default("USDT").describe("报价货币，如 USDT、BUSD（默认 USDT）"),
});

const GetOrderBookSchema = z.object({
  symbol: z.string().describe("交易对符号，如 BTC、ETH、SOL（不区分大小写）"),
  quote: z.string().optional().default("USDT").describe("报价货币，如 USDT、BUSD（默认 USDT）"),
  limit: z.number().int().min(5).max(5000).optional().default(100).describe("返回的订单深度数量（5-5000，默认100）"),
});

type GetPriceParams = z.infer<typeof GetPriceSchema>;
type Get24hStatsParams = z.infer<typeof Get24hStatsSchema>;
type GetOhlcvParams = z.infer<typeof GetOhlcvSchema>;
type GetSymbolOverviewParams = z.infer<typeof GetSymbolOverviewSchema>;
type GetOrderBookParams = z.infer<typeof GetOrderBookSchema>;

// Binance API 响应类型
interface BinancePriceResponse {
  symbol: string;
  price: string;
}

interface Binance24hStatsResponse {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

// K线数据格式：[开盘时间, 开盘价, 最高价, 最低价, 收盘价, 成交量, 收盘时间, 成交额, 成交笔数, 主动买入成交量, 主动买入成交额, 忽略字段]
type BinanceKline = [
  number, // 开盘时间
  string, // 开盘价
  string, // 最高价
  string, // 最低价
  string, // 收盘价
  string, // 成交量
  number, // 收盘时间
  string, // 成交额
  number, // 成交笔数
  string, // 主动买入成交量
  string, // 主动买入成交额
  string  // 忽略字段
];

// 订单簿数据格式：[价格, 数量]
type OrderBookEntry = [string, string];

interface BinanceOrderBookResponse {
  lastUpdateId: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

/**
 * 获取 Binance 实时价格
 */
async function getPrice(params: GetPriceParams): Promise<{ price: string; timestamp: number; symbol: string }> {
  const { symbol, quote } = params;
  
  // 转换为 Binance 格式：BTC -> BTCUSDT
  const binanceSymbol = `${symbol.toUpperCase()}${quote.toUpperCase()}`;
  
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Binance API 错误: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }
    
    const data = (await response.json()) as BinancePriceResponse;
    
    return {
      price: data.price,
      timestamp: Date.now(),
      symbol: data.symbol,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`获取价格失败: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 获取 Binance 24小时统计数据
 */
async function get24hStats(params: Get24hStatsParams): Promise<Binance24hStatsResponse> {
  const { symbol, quote } = params;
  
  // 转换为 Binance 格式：BTC -> BTCUSDT
  const binanceSymbol = `${symbol.toUpperCase()}${quote.toUpperCase()}`;
  
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Binance API 错误: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }
    
    const data = (await response.json()) as Binance24hStatsResponse;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`获取24小时统计数据失败: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 获取 Binance K线数据（OHLCV）
 */
async function getOhlcv(params: GetOhlcvParams): Promise<BinanceKline[]> {
  const { symbol, quote, interval, limit } = params;
  
  // 转换为 Binance 格式：BTC -> BTCUSDT
  const binanceSymbol = `${symbol.toUpperCase()}${quote.toUpperCase()}`;
  
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Binance API 错误: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }
    
    const data = (await response.json()) as BinanceKline[];
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`获取K线数据失败: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 计算移动平均线（MA）
 */
function calculateMA(prices: number[], period: number): number[] {
  const ma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      ma.push(NaN); // 数据不足时返回 NaN
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      ma.push(sum / period);
    }
  }
  return ma;
}

/**
 * 计算相对强弱指标（RSI）
 * RSI = 100 - (100 / (1 + RS))
 * RS = 平均上涨幅度 / 平均下跌幅度
 */
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50; // 数据不足时返回中性值
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.filter(c => c > 0);
  const losses = changes.filter(c => c < 0).map(c => Math.abs(c));

  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

  if (avgLoss === 0) {
    return 100; // 没有下跌，RSI 为 100
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

/**
 * 分析K线趋势（增强版）
 * 基于移动平均线、RSI指标和价格变化进行综合判断
 */
function analyzeTrend(klines: BinanceKline[]): {
  trend: "上涨" | "下跌" | "盘整";
  trendStrength: number; // -1 到 1，负数表示下跌，正数表示上涨，接近0表示盘整
  description: string;
  indicators: {
    ma5?: number;
    ma10?: number;
    ma20?: number;
    rsi: number;
    priceChange: number;
    priceChangePercent: number;
  };
} {
  if (klines.length < 5) {
    return {
      trend: "盘整",
      trendStrength: 0,
      description: "数据不足，无法判断趋势",
      indicators: {
        rsi: 50,
        priceChange: 0,
        priceChangePercent: 0,
      },
    };
  }

  // 取最近20根K线进行分析
  const recentKlines = klines.slice(-20);
  const closes = recentKlines.map((k) => parseFloat(k[4])); // 收盘价
  const highs = recentKlines.map((k) => parseFloat(k[2])); // 最高价
  const lows = recentKlines.map((k) => parseFloat(k[3])); // 最低价
  
  const currentPrice = closes[closes.length - 1];
  const firstClose = closes[0];
  const priceChange = currentPrice - firstClose;
  const priceChangePercent = (priceChange / firstClose) * 100;

  // 计算移动平均线
  const ma5 = calculateMA(closes, 5);
  const ma10 = calculateMA(closes, 10);
  const ma20 = calculateMA(closes, 20);
  
  const currentMA5 = ma5[ma5.length - 1];
  const currentMA10 = ma10[ma10.length - 1];
  const currentMA20 = ma20[ma20.length - 1];

  // 计算 RSI
  const rsi = calculateRSI(closes, 14);

  // 综合判断趋势
  let trend: "上涨" | "下跌" | "盘整";
  let trendStrength: number;
  let description: string;

  // 趋势判断因子
  const priceFactor = priceChangePercent / 5; // 价格变化因子（5%对应1）
  const maFactor = currentMA5 && currentMA10 && currentMA20
    ? (currentPrice - currentMA10) / currentMA10 * 20 // MA位置因子
    : 0;
  const rsiFactor = (rsi - 50) / 50; // RSI因子（50为中性）

  // 计算综合趋势强度（加权平均）
  trendStrength = Math.max(-1, Math.min(1, 
    priceFactor * 0.4 +      // 价格变化权重 40%
    maFactor * 0.3 +          // MA位置权重 30%
    rsiFactor * 0.3           // RSI权重 30%
  ));

  // 判断趋势类型
  const bullishSignals = [
    priceChangePercent > 1,                    // 价格上涨超过1%
    currentMA5 && currentMA5 > currentMA10,    // MA5在MA10之上
    currentMA10 && currentMA10 > currentMA20,  // MA10在MA20之上
    currentPrice > (currentMA10 || currentPrice), // 价格在MA10之上
    rsi > 50 && rsi < 70,                      // RSI在健康上涨区间
  ].filter(Boolean).length;

  const bearishSignals = [
    priceChangePercent < -1,                   // 价格下跌超过1%
    currentMA5 && currentMA5 < currentMA10,     // MA5在MA10之下
    currentMA10 && currentMA10 < currentMA20,    // MA10在MA20之下
    currentPrice < (currentMA10 || currentPrice), // 价格在MA10之下
    rsi < 50 && rsi > 30,                      // RSI在健康下跌区间
  ].filter(Boolean).length;

  // 判断趋势
  if (trendStrength > 0.3 && bullishSignals >= 3) {
    trend = "上涨";
    const maInfo = currentMA5 && currentMA10 
      ? `MA5(${currentMA5.toFixed(2)}) > MA10(${currentMA10.toFixed(2)})`
      : "";
    description = `明显上涨趋势。价格从 ${firstClose.toFixed(2)} 上涨至 ${currentPrice.toFixed(2)}，涨幅 ${priceChangePercent.toFixed(2)}%。${maInfo ? maInfo + "，" : ""}RSI=${rsi.toFixed(1)}（${rsi > 70 ? "超买" : "健康上涨"}）。`;
  } else if (trendStrength < -0.3 && bearishSignals >= 3) {
    trend = "下跌";
    const maInfo = currentMA5 && currentMA10 
      ? `MA5(${currentMA5.toFixed(2)}) < MA10(${currentMA10.toFixed(2)})`
      : "";
    description = `明显下跌趋势。价格从 ${firstClose.toFixed(2)} 下跌至 ${currentPrice.toFixed(2)}，跌幅 ${Math.abs(priceChangePercent).toFixed(2)}%。${maInfo ? maInfo + "，" : ""}RSI=${rsi.toFixed(1)}（${rsi < 30 ? "超卖" : "健康下跌"}）。`;
  } else {
    trend = "盘整";
    const volatility = Math.max(...highs) - Math.min(...lows);
    const volatilityPercent = (volatility / currentPrice) * 100;
    description = `盘整状态。价格在 ${firstClose.toFixed(2)} 附近波动，变化 ${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%，波动幅度 ${volatilityPercent.toFixed(2)}%。RSI=${rsi.toFixed(1)}（${rsi > 70 ? "可能超买" : rsi < 30 ? "可能超卖" : "中性"}）。`;
  }

  return {
    trend,
    trendStrength,
    description,
    indicators: {
      ma5: currentMA5 || undefined,
      ma10: currentMA10 || undefined,
      ma20: currentMA20 || undefined,
      rsi: rsi,
      priceChange: priceChange,
      priceChangePercent: priceChangePercent,
    },
  };
}

/**
 * 获取交易对综合概览（智能组合工具）
 * 整合价格、24小时统计、K线趋势分析
 */
async function getSymbolOverview(params: GetSymbolOverviewParams): Promise<{
  symbol: string;
  currentPrice: string;
  priceChange24h: string;
  priceChangePercent24h: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  quoteVolume24h: string;
  trend: {
    trend: "上涨" | "下跌" | "盘整";
    trendStrength: number;
    description: string;
    indicators: {
      ma5?: number;
      ma10?: number;
      ma20?: number;
      rsi: number;
      priceChange: number;
      priceChangePercent: number;
    };
  };
  volumeAnalysis: {
    volumeLevel: "高" | "中" | "低";
    description: string;
  };
  timestamp: number;
}> {
  const { symbol, quote } = params;
  const binanceSymbol = `${symbol.toUpperCase()}${quote.toUpperCase()}`;

  try {
    // 并行获取24小时统计和K线数据
    const [stats, klines] = await Promise.all([
      get24hStats(params),
      getOhlcv({ symbol, quote, interval: "1h", limit: 20 }), // 获取最近20根1小时K线用于趋势分析
    ]);

    // 分析趋势
    const trend = analyzeTrend(klines);

    // 分析交易量（基于24小时成交额）
    const quoteVolume = parseFloat(stats.quoteVolume);
    let volumeLevel: "高" | "中" | "低";
    let volumeDescription: string;

    // 简单的交易量分级（可以根据实际情况调整阈值）
    if (quoteVolume > 1000000000) { // 10亿以上
      volumeLevel = "高";
      volumeDescription = "交易量很高，市场活跃";
    } else if (quoteVolume > 100000000) { // 1亿以上
      volumeLevel = "中";
      volumeDescription = "交易量中等，市场较为活跃";
    } else {
      volumeLevel = "低";
      volumeDescription = "交易量较低，市场相对冷清";
    }

    return {
      symbol: binanceSymbol,
      currentPrice: stats.lastPrice,
      priceChange24h: stats.priceChange,
      priceChangePercent24h: stats.priceChangePercent,
      high24h: stats.highPrice,
      low24h: stats.lowPrice,
      volume24h: stats.volume,
      quoteVolume24h: stats.quoteVolume,
      trend,
      volumeAnalysis: {
        volumeLevel,
        description: volumeDescription,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`获取交易对概览失败: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 获取 Binance 订单簿（交易深度）
 */
async function getOrderBook(params: GetOrderBookParams): Promise<BinanceOrderBookResponse> {
  const { symbol, quote, limit } = params;
  
  // 转换为 Binance 格式：BTC -> BTCUSDT
  const binanceSymbol = `${symbol.toUpperCase()}${quote.toUpperCase()}`;
  
  const url = `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Binance API 错误: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }
    
    const data = (await response.json()) as BinanceOrderBookResponse;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`获取订单簿失败: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 创建并启动 MCP 服务器
 */
async function main() {
  const server = new Server(
    {
      name: "crypto-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 列出可用工具
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_price",
          description: "获取 Binance 实时价格",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "交易对符号，如 BTC、ETH、SOL（不区分大小写）",
              },
              quote: {
                type: "string",
                description: "报价货币，如 USDT、BUSD（默认 USDT）",
                default: "USDT",
              },
            },
            required: ["symbol"],
          },
        },
        {
          name: "get_24h_stats",
          description: "获取 Binance 24小时统计数据（今日涨跌、成交量、最高/最低）",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "交易对符号，如 BTC、ETH、SOL（不区分大小写）",
              },
              quote: {
                type: "string",
                description: "报价货币，如 USDT、BUSD（默认 USDT）",
                default: "USDT",
              },
            },
            required: ["symbol"],
          },
        },
        {
          name: "get_ohlcv",
          description: "获取 Binance K线数据（技术分析所需）",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "交易对符号，如 BTC、ETH、SOL（不区分大小写）",
              },
              quote: {
                type: "string",
                description: "报价货币，如 USDT、BUSD（默认 USDT）",
                default: "USDT",
              },
              interval: {
                type: "string",
                enum: ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"],
                description: "K线时间间隔，如 1m, 5m, 1h, 1d（默认 1h）",
                default: "1h",
              },
              limit: {
                type: "number",
                description: "返回的K线数量（1-1000，默认500）",
                default: 500,
              },
            },
            required: ["symbol"],
          },
        },
        {
          name: "get_symbol_overview",
          description: "获取交易对综合概览（当前价格、涨跌幅、最高/最低、趋势判断、交易量分析）",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "交易对符号，如 BTC、ETH、SOL（不区分大小写）",
              },
              quote: {
                type: "string",
                description: "报价货币，如 USDT、BUSD（默认 USDT）",
                default: "USDT",
              },
            },
            required: ["symbol"],
          },
        },
        {
          name: "get_order_book",
          description: "获取交易深度（订单簿）- 查看流动性、深度、买卖盘强度",
          inputSchema: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "交易对符号，如 BTC、ETH、SOL（不区分大小写）",
              },
              quote: {
                type: "string",
                description: "报价货币，如 USDT、BUSD（默认 USDT）",
                default: "USDT",
              },
              limit: {
                type: "number",
                description: "返回的订单深度数量（5-5000，默认100）",
                default: 100,
              },
            },
            required: ["symbol"],
          },
        },
      ],
    };
  });

  // 处理工具调用
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "get_price") {
        // 验证参数
        const params = GetPriceSchema.parse(args || {});
        
        // 调用函数
        const result = await getPrice(params);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  symbol: result.symbol,
                  price: result.price,
                  quote: params.quote,
                  timestamp: result.timestamp,
                  timestampISO: new Date(result.timestamp).toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } else if (name === "get_24h_stats") {
        // 验证参数
        const params = Get24hStatsSchema.parse(args || {});
        
        // 调用函数
        const result = await get24hStats(params);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  symbol: result.symbol,
                  priceChange: result.priceChange,
                  priceChangePercent: result.priceChangePercent,
                  weightedAvgPrice: result.weightedAvgPrice,
                  prevClosePrice: result.prevClosePrice,
                  lastPrice: result.lastPrice,
                  bidPrice: result.bidPrice,
                  askPrice: result.askPrice,
                  openPrice: result.openPrice,
                  highPrice: result.highPrice,
                  lowPrice: result.lowPrice,
                  volume: result.volume,
                  quoteVolume: result.quoteVolume,
                  openTime: result.openTime,
                  closeTime: result.closeTime,
                  openTimeISO: new Date(result.openTime).toISOString(),
                  closeTimeISO: new Date(result.closeTime).toISOString(),
                  timestamp: Date.now(),
                },
                null,
                2
              ),
            },
          ],
        };
      } else if (name === "get_ohlcv") {
        // 验证参数
        const params = GetOhlcvSchema.parse(args || {});
        
        // 调用函数
        const klines = await getOhlcv(params);
        
        // 格式化K线数据，使其更易读
        const formattedKlines = klines.map((kline) => ({
          openTime: kline[0],
          openTimeISO: new Date(kline[0]).toISOString(),
          open: kline[1],
          high: kline[2],
          low: kline[3],
          close: kline[4],
          volume: kline[5],
          closeTime: kline[6],
          closeTimeISO: new Date(kline[6]).toISOString(),
          quoteVolume: kline[7],
          trades: kline[8],
          takerBuyBaseVolume: kline[9],
          takerBuyQuoteVolume: kline[10],
        }));
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  symbol: `${params.symbol.toUpperCase()}${params.quote.toUpperCase()}`,
                  interval: params.interval,
                  limit: params.limit,
                  count: formattedKlines.length,
                  klines: formattedKlines,
                  timestamp: Date.now(),
                },
                null,
                2
              ),
            },
          ],
        };
      } else if (name === "get_symbol_overview") {
        // 验证参数
        const params = GetSymbolOverviewSchema.parse(args || {});
        
        // 调用函数
        const overview = await getSymbolOverview(params);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ...overview,
                  timestampISO: new Date(overview.timestamp).toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } else if (name === "get_order_book") {
        // 验证参数
        const params = GetOrderBookSchema.parse(args || {});
        
        // 调用函数
        const orderBook = await getOrderBook(params);
        
        // 计算买卖盘强度
        const bidTotal = orderBook.bids.reduce((sum, [price, qty]) => sum + parseFloat(price) * parseFloat(qty), 0);
        const askTotal = orderBook.asks.reduce((sum, [price, qty]) => sum + parseFloat(price) * parseFloat(qty), 0);
        const bidAskRatio = bidTotal / (bidTotal + askTotal);
        
        // 计算平均买卖价差
        const bestBid = parseFloat(orderBook.bids[0]?.[0] || "0");
        const bestAsk = parseFloat(orderBook.asks[0]?.[0] || "0");
        const spread = bestAsk - bestBid;
        const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;
        
        // 格式化订单簿数据
        const formattedBids = orderBook.bids.slice(0, 10).map(([price, qty]) => ({
          price,
          quantity: qty,
          total: (parseFloat(price) * parseFloat(qty)).toFixed(2),
        }));
        
        const formattedAsks = orderBook.asks.slice(0, 10).map(([price, qty]) => ({
          price,
          quantity: qty,
          total: (parseFloat(price) * parseFloat(qty)).toFixed(2),
        }));
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  symbol: `${params.symbol.toUpperCase()}${params.quote.toUpperCase()}`,
                  lastUpdateId: orderBook.lastUpdateId,
                  bestBid: orderBook.bids[0]?.[0] || "0",
                  bestAsk: orderBook.asks[0]?.[0] || "0",
                  spread: spread.toFixed(8),
                  spreadPercent: spreadPercent.toFixed(4),
                  bidAskRatio: bidAskRatio.toFixed(4),
                  liquidity: {
                    bidTotal: bidTotal.toFixed(2),
                    askTotal: askTotal.toFixed(2),
                    totalLiquidity: (bidTotal + askTotal).toFixed(2),
                    bidStrength: bidAskRatio > 0.55 ? "强" : bidAskRatio < 0.45 ? "弱" : "平衡",
                  },
                  topBids: formattedBids,
                  topAsks: formattedAsks,
                  totalBids: orderBook.bids.length,
                  totalAsks: orderBook.asks.length,
                  timestamp: Date.now(),
                  timestampISO: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `未知工具: ${name}`
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `参数验证失败: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
        );
      }
      
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `工具执行失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  // 启动服务器（使用 stdio 传输）
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Crypto MCP Server 已启动，等待客户端连接...");
}

// 运行服务器
main().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});

