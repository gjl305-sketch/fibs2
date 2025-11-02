// types.ts

// --- Generic/Shared Types ---
export interface Message {
    id: number;
    sender: 'user' | 'ai';
    text: string;
    type?: 'idea' | 'comment' | 'confirmation';
    actionableSymbol?: string;
    tradeDetails?: {
        symbol: string;
        side: 'buy' | 'sell';
        quantity: number;
        order_type: 'market' | 'limit';
        limit_price?: number;
    };
    isHandled?: boolean;
}

// Chart Lab config
export interface ChartConfig {
    id: string;
    symbol: string;
    timeframe: string;
    indicators: string[];
    color: string;
}


// --- Alpaca & Polygon Data Models ---
export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  non_marginable_buying_power: string;
  cash: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  multiplier: string;
  shorting_enabled: boolean;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  last_maintenance_margin: string;
  sma: string;
  daytrade_count: number;
}
export interface AlpacaPosition {
    asset_id: string;
    symbol: string;
    exchange: string;
    asset_class: string;
    avg_entry_price: string;
    qty: string;
    side: 'long' | 'short';
    market_value: string;
    cost_basis: string;
    unrealized_pl: string;
    unrealized_plpc: string;
    unrealized_intraday_pl: string;
    unrealized_intraday_plpc: string;
    current_price: string;
    lastday_price: string;
    change_today: string;
}
export interface OrderParams {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
    time_in_force: 'day' | 'gtc' | 'opg' | 'cls';
    limit_price?: number;
    stop_price?: number;
    extended_hours?: boolean;
}
export interface AlpacaBar { t: string; o: number; h: number; l: number; c: number; v: number; }
export interface AlpacaNews { id?: number; headline: string; summary: string; author: string; created_at: string; source: string; symbols: string[]; url: string; }
export interface LiveQuoteData { symbol: string; price: number; dailyChange: number; dailyChangePercent: number; timestamp: string; }
export interface Mover { symbol: string; price: number; changePercent: number; }
export interface DarkPoolPrint { symbol: string; price: number; volume: number; timestamp: string; }
export interface OptionContract { strike: number; type: 'call' | 'put'; bid: number; ask: number; delta: number; gamma: number; theta: number; vega: number; iv: number; openInterest: number; }
export interface OptionsChain { expiry: string; contracts: OptionContract[]; }
export interface MarketBreadthData { adLine: { date: string; value: number }[]; highLows: { date: string; highs: number; lows: number }[]; }


// --- Simulator & Account Models ---
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'Market' | 'Limit' | 'Stop' | 'Stop Limit';
export type OrderTimeInForce = 'Day' | 'GTC';
export type OrderStatus = 'New' | 'Filled' | 'Partially Filled' | 'Canceled' | 'Rejected' | 'Pending' | 'Accepted';

export interface Order {
    id: string;
    timestamp: string;
    symbol: string;
    side: 'Buy' | 'Sell';
    type: OrderType;
    quantity: number;
    status: OrderStatus;
    limitPrice?: number;
    stopPrice?: number;
    realizedPL?: number;
    timeInForce: OrderTimeInForce;
}
export interface SimulatedHolding {
    id: string;
    symbol: string;
    name: string;
    shares: number;
    avgCost: number;
    currentPrice?: number;
    type: 'stock';
}
export type TradingStyle = 'Jeremiah' | 'Scalper' | 'Swing' | 'Momentum' | 'Contrarian';

export const tradingStyles: Record<TradingStyle, { name: string; description: string }> = {
    Jeremiah: { name: 'Jeremiah Protocol', description: 'Fibonacci-based, balanced risk strategy.' },
    Scalper: { name: 'High-Frequency Scalper', description: 'Aims for small, rapid profits on high-volume stocks.' },
    Swing: { name: 'Swing Trader', description: 'Holds positions for several days to capture larger price swings.' },
    Momentum: { name: 'Momentum Master', description: 'Identifies and trades assets with strong directional price movement.' },
    Contrarian: { name: 'Contrarian (Dark Pools)', description: 'Fades simulated large "dark pool" trades near key Fib levels.' },
};

export interface JProfitAccount {
    id: string;
    name: string;
    type: 'live' | 'paper' | 'simulated';
    createdAt: string;
    initialCapital: number;
    buyingPower: number;
    portfolioValue: number;
    holdings: SimulatedHolding[];
    tradeHistory: Order[];
    notes?: string;
    botStrategy?: TradingStyle;
}


// --- Gemini Service AI Models ---
export interface AnalyticalTradeDecision {
    decision: 'BUY' | 'SELL' | 'HOLD';
    quantityPercent: number;
    reasoning: string;
    sentiment: string;
    keyIndicators: string[];
    fibAnalysis: string;
    stopLossPrice?: number;
    takeProfitPrice?: number;
}
export interface SymbolProfile { 
    name: string; 
    ceo: string; 
    hq: string; 
    marketCap: string; 
    floatShares: string; 
    shortFloatPercent: string; 
    revenue: string; 
    eps: string; 
    peRatio: string; 
    totalDebt: string; 
    totalCash: string; 
    rsi: string; 
    macd: string; 
    volumeSpike: string; 
    sma200: string; 
    analystRating: string; 
    analystTarget: string; 
    nextEarningsDate: string; 
    volume: string;
    iv?: string;
    fiftyTwoWeekHigh?: string;
    fiftyTwoWeekLow?: string;
    dailyHigh?: string;
    dailyLow?: string;
    avgVolume?: string;
    relativeVolume?: string;
}
export interface JeremiahAnalysis { sentiment: string; sentimentScore: number; support: number; resistance: number; pattern: string; volatility: string; keyIndicators: { rsi: string; macd: string; bollingerBands: string; stochastic: string; }; keyDrivers: string; take: string; forecast: { trend: string; prophecy: string; }; }
export interface GroundingSource { web: { uri: string; title: string; } }
export interface ComprehensiveSymbolData { profile: SymbolProfile; analysis: JeremiahAnalysis; sentiment: { score: number }; }
export interface JeremiahProphecy { oneYearTarget: number; confidence: 'High' | 'Medium' | 'Low'; historicalAnalog: string; keyDrivers: string; narrative: string; }
export interface RealtimeSignal { symbol: string; signal: 'BUY' | 'SELL' | 'HOLD'; confidence: number; reasoning: string; }
export interface MarketScanResult { symbol: string; tradeType: 'Scalp' | 'Swing' | 'Breakout'; conviction: 'High' | 'Medium' | 'Speculative'; reasoning: string; }
export interface SmallCapScanResult {
    symbol: string;
    price: number;
    changePercent: number;
    volume: string;
    avgVolume: string;
    catalyst: string;
    float?: string;
    peRatio?: string;
}
export interface DailyBriefing {
    timestamp: string;
    title: string;
    summary: string;
    keyFactors: string[];
}


// --- Supabase Logging Model ---
export interface SupabaseLog {
    executed_at: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    order_type: OrderParams['type'];
    execution_price?: number;
    status: 'filled' | 'submitted' | 'failed';
    limit_price?: number;
    stop_price?: number;
}

// --- Other Misc Types ---
export interface SimulatorSettings {
    frequency: number; // Time between alerts
    duration: number;  // How long an alert is active
}
export interface Slot<T> {
    name: string;
    savedAt: string;
    data: T;
}

// --- AIBot Types ---
export interface LogEntry {
    id: string;
    timestamp: string;
    action: 'BUY' | 'SELL' | 'HOLD' | 'ANALYSIS' | 'ERROR' | 'INFO' | 'SYSTEM';
    type?: 'confirmation' | 'confirmed' | 'denied';
    symbol: string;
    summary: string;
    decision?: AnalyticalTradeDecision;
    details?: {
        sentiment: string;
        indicators: string[];
        fibAnalysis: string;
        quantityPercent?: number;
        stopLossPrice?: number;
        takeProfitPrice?: number;
    };
}

export interface ManagedPosition {
    symbol: string;
    stopLossPrice: number;
    takeProfitPrice: number;
}