export interface JProfitConfig {
    accountType: 'paper' | 'live';
    paperApiKey: string;
    paperApiSecret: string;
    liveApiKey: string;
    liveApiSecret: string;
    polygonApiKey: string;
    webhookUrl?: string;
}

const JPROFIT_CONFIG_KEY = 'jprofit_config_v1';

export function getJProfitConfig(): JProfitConfig {
    const saved = localStorage.getItem(JPROFIT_CONFIG_KEY);
    const defaultConfig: JProfitConfig = {
        accountType: 'paper',
        paperApiKey: '',
        paperApiSecret: '',
        liveApiKey: '',
        liveApiSecret: '',
        polygonApiKey: 'HPkPrgkkZxBAFO7_BiBmNS4qpvJ9b0LO', // Pre-populated key
        webhookUrl: '',
    };
    try {
        if (saved) return { ...defaultConfig, ...JSON.parse(saved) };
    } catch (e) {
        console.error("Failed to parse JProfit config from localStorage");
    }
    return defaultConfig;
}

export function saveJProfitConfig(config: JProfitConfig): void {
    localStorage.setItem(JPROFIT_CONFIG_KEY, JSON.stringify(config));
}

export function getActiveApiKeys() {
    const config = getJProfitConfig();
    const isLive = config.accountType === 'live';
    
    return {
        apiKey: isLive ? config.liveApiKey : config.paperApiKey,
        apiSecret: isLive ? config.liveApiSecret : config.paperApiSecret,
        tradeApiUrl: isLive ? 'https://api.alpaca.markets' : 'https://paper-api.alpaca.markets',
        dataApiUrl: 'https://data.alpaca.markets', // Kept for any other potential use
        stockWebsocketUrl: 'wss://stream.data.alpaca.markets/v2/iex',
        polygonWebsocketUrl: 'wss://socket.polygon.io/stocks',
        polygonApiKey: config.polygonApiKey,
        accountType: config.accountType
    };
}