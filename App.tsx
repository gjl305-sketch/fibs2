import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';

// NEW: Import SplashScreen
import { SplashScreen } from './components/SplashScreen';

// Layout
import { SwipeableHeader } from './components/layout/TopNavBar';
import { MegaChart } from './components/dashboard/MegaChart';
import { NotificationBubbleManager } from './components/ui/NotificationBubbleManager';
import { WorldClock } from './components/ui/WorldClock';
import { FloatingNewsManager } from './components/ui/FloatingNewsManager'; // New import

// Views
import { Portfolio } from './components/views/Portfolio';
import { MarketIntel } from './components/views/MarketIntel';
import { AICore } from './components/views/AICore';
import { Settings } from './components/views/Settings';
import { Watchtower } from './components/views/Watchtower';
import { ChartLab } from './components/views/ChartLab';
import { AccountAnalysisPanel } from './components/dashboard/AccountAnalysisPanel';
import { SymbolPage } from './components/dashboard/SymbolPage';
import { WatchlistDrawer } from './components/ui/WatchlistDrawer';
import { GlobalMoon } from './components/ui/GlobalMoon';
import { DailyBriefingPanel } from './components/ui/DailyBriefingPanel';

// Services & Data
import { getJProfitConfig, saveJProfitConfig, JProfitConfig } from './config';
import { getLiveQuote, getAccount, getPositions, ApiKeyError, verifyAlpacaKeys, createOrder as createBrokerageOrder } from './services/alpacaService';
import { verifyPolygonKey } from './services/polygonService';
import { websocketService } from './services/websocketService';
import { accountWebsocketService } from './services/accountWebsocketService';
import { idbService } from './services/indexedDBService';
import { stockData } from './data/stocks';
import { getMarketStatus, MarketStatus } from './services/marketHoursService';
import { getDailyMarketBriefing, getBreakingMarketNews } from './services/geminiService'; // New import
import type { AlpacaAccount, AlpacaPosition, OrderParams, JProfitAccount, Message, JeremiahProphecy, Order, SimulatedHolding, DailyBriefing, GroundingSource, AlpacaNews } from './types';


const stockNameMap = new Map(stockData.map(s => [s.symbol, s.name]));
const LAST_VIEWED_SYMBOL_KEY = 'jprofit_last_symbol_v2';
const WATCHLIST_KEY = 'jprofit_watchlist_v1';
const ACTIVE_ACCOUNT_KEY = 'jprofit_active_account_id_v1';
const CHAT_HISTORY_KEY = 'jprofit_chat_history_v1';
const NOTIFICATION_BUBBLES_KEY = 'jprofit_notification_bubbles_v1';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState('Portfolio');
    const [previousView, setPreviousView] = useState('Portfolio');
    const [currentSymbol, setCurrentSymbol] = useState(() => localStorage.getItem(LAST_VIEWED_SYMBOL_KEY) || 'AAPL');
    const [liveAccount, setLiveAccount] = useState<AlpacaAccount | null>(null);
    const [livePositions, setLivePositions] = useState<AlpacaPosition[]>([]);
    const [appData, setAppData] = useState<{ accounts: Record<string, JProfitAccount>, activeAccountId: string | null }>({ accounts: {}, activeAccountId: null });
    const [appSettings, setAppSettings] = useState<any>({ profilePictureUrl: null, isMuted: false, useVoice: true, useHaptics: true });
    
    const [notificationBubbles, setNotificationBubbles] = useState<{ id: number; symbol: string; message: string; type: 'alert' | 'confirmation' }[]>([]);
    const [watchlist, setWatchlist] = useState<string[]>(['SPY', 'QQQ', 'DIA']);
    
    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [savedProphecies, setSavedProphecies] = useState<Record<string, JeremiahProphecy>>({});
    
    // MegaChart State
    const [isMegaChartOpen, setIsMegaChartOpen] = useState(false);
    const [drawChartRequest, setDrawChartRequest] = useState<{ symbol: string; timeframe?: string; indicators?: string[] } | null>(null);

    const [isAccountAnalysisOpen, setIsAccountAnalysisOpen] = useState(false);
    const [marketStatus, setMarketStatus] = useState<MarketStatus>(getMarketStatus());
    const [apiKeys, setApiKeys] = useState<JProfitConfig>(getJProfitConfig());
    
    // Startup state
    const [keysReady, setKeysReady] = useState(false);
    const [checkingInitialKeys, setCheckingInitialKeys] = useState(true);
    const [isSavingKeys, setIsSavingKeys] = useState(false);

    // AI Voice State
    const [isVoiceActivated, setIsVoiceActivated] = useState(false);

    // Parallax effect state
    const [moonContainerStyle, setMoonContainerStyle] = useState<React.CSSProperties>({});
    const [moonBodyStyle, setMoonBodyStyle] = useState<React.CSSProperties>({});
    
    // Daily Briefing State
    const [dailyBriefing, setDailyBriefing] = useState<{ briefing: DailyBriefing, sources: GroundingSource[] } | null>(null);
    const [isBriefingOpen, setIsBriefingOpen] = useState(false);
    const prevMarketStatusRef = useRef<boolean>(marketStatus.isOpen);

    // Header visibility state
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

    // Breaking News State
    const [breakingNews, setBreakingNews] = useState<AlpacaNews[]>([]);

    // Chart Lab State
    const [isChartLabOpen, setIsChartLabOpen] = useState(false);


    // Unified account state
    const [activeAccountId, setActiveAccountId] = useState(() => localStorage.getItem(ACTIVE_ACCOUNT_KEY) || 'brokerage');
    useEffect(() => { localStorage.setItem(ACTIVE_ACCOUNT_KEY, activeAccountId); }, [activeAccountId]);

    const brokerageAccountType = apiKeys.accountType;

    const brokerageAccount = useMemo(() => {
        if (!liveAccount) return null;
        return {
            ...liveAccount,
            type: brokerageAccountType,
            id: 'brokerage',
            name: brokerageAccountType === 'live' ? 'Live Money' : 'Paper Money'
        };
    }, [liveAccount, brokerageAccountType]);

    const allAccounts = useMemo(() => {
        const accounts = [];
        if (brokerageAccount) accounts.push(brokerageAccount);
        if (appData.accounts) accounts.push(...Object.values(appData.accounts));
        return accounts;
    }, [brokerageAccount, appData.accounts]);
    
    const activeAccount = useMemo(() => {
        if (activeAccountId === 'brokerage') return brokerageAccount;
        return appData.accounts[activeAccountId];
    }, [activeAccountId, brokerageAccount, appData.accounts]);

    const activePositions = useMemo<(AlpacaPosition | SimulatedHolding)[]>(() => {
        if (activeAccountId === 'brokerage') {
            return livePositions;
        }
        if (activeAccount && 'holdings' in activeAccount) {
            return activeAccount.holdings;
        }
        return [];
    }, [activeAccountId, livePositions, activeAccount]);

    // Parallax and 3D tilt effect logic for the moon
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            // Normalize coordinates from -1 to 1
            const x = (clientX / innerWidth - 0.5) * 2;
            const y = (clientY / innerHeight - 0.5) * 2;
            
            // Parallax translation for the container
            const translateX = -x * 15;
            const translateY = -y * 15;
            setMoonContainerStyle({ transform: `translate(${translateX}px, ${translateY}px)` });

            // 3D tilt for the moon body
            const rotateY = x * 10; // Max 10 degrees tilt
            const rotateX = -y * 10;
            setMoonBodyStyle({ transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)` });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);


    const showNotification = useCallback((message: string, type: 'success' | 'error', symbol?: string) => {
        const newNotification = { id: Date.now(), symbol: symbol || 'SYSTEM', message, type: type === 'success' ? 'confirmation' : 'alert' as 'confirmation' | 'alert' };
        setNotificationBubbles(prev => [...prev, newNotification]);
    }, []);

    const dismissNotification = (id: number) => {
        setNotificationBubbles(prev => prev.filter(n => n.id !== id));
    };

    const handleSaveApiKeysForSettings = async (keysToSave: JProfitConfig) => {
        setIsSavingKeys(true);
        const { accountType, paperApiKey, paperApiSecret, liveApiKey, liveApiSecret, polygonApiKey } = keysToSave;
        const isLive = accountType === 'live';
        const key = isLive ? liveApiKey : paperApiKey;
        const secret = isLive ? liveApiSecret : paperApiSecret;

        if (!key || !secret || !polygonApiKey) {
            showNotification('All API keys are required.', 'error');
            setIsSavingKeys(false);
            return false;
        }

        try {
            const [alpacaResult, polygonResult] = await Promise.all([
                verifyAlpacaKeys(key, secret, accountType),
                verifyPolygonKey(polygonApiKey)
            ]);
            
            if (alpacaResult.success && polygonResult.success) {
                saveJProfitConfig(keysToSave);
                setApiKeys(keysToSave);
                showNotification('API keys updated. Reloading app to apply changes...', 'success');
                setIsSavingKeys(false);
                setTimeout(() => window.location.reload(), 2000);
                return true;
            } else {
                let errorMsg = '';
                if (!alpacaResult.success) errorMsg += `Alpaca: ${alpacaResult.error} `;
                if (!polygonResult.success) errorMsg += `Polygon: ${polygonResult.error}`;
                showNotification(`API Key verification failed: ${errorMsg}`, 'error');
                setIsSavingKeys(false);
                return false;
            }
        } catch (error) {
            console.error("Error during API key verification:", error);
            showNotification(`An unexpected error occurred during verification: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            setIsSavingKeys(false);
            return false;
        }
    };

    useEffect(() => {
        const checkInitialKeys = async () => {
            const initialKeys = getJProfitConfig();
            const { accountType, paperApiKey, paperApiSecret, liveApiKey, liveApiSecret, polygonApiKey } = initialKeys;
            const isLive = accountType === 'live';
            const key = isLive ? liveApiKey : paperApiKey;
            const secret = isLive ? liveApiSecret : paperApiSecret;
    
            if (key && secret && polygonApiKey) {
                try {
                    const [alpacaResult, polygonResult] = await Promise.all([
                        verifyAlpacaKeys(key, secret, accountType),
                        verifyPolygonKey(polygonApiKey)
                    ]);
                    if (alpacaResult.success && polygonResult.success) {
                        setKeysReady(true);
                    }
                } catch (error) {
                    console.error("Error during initial key verification:", error);
                }
            }
            setCheckingInitialKeys(false);
        };
        checkInitialKeys();
    }, []);

    useEffect(() => {
        if (!keysReady) return;

        let statusInterval: ReturnType<typeof setInterval> | null = null;

        const initializeApp = async () => {
            // 1. Handle Market Status
            const initialStatus = getMarketStatus();
            setMarketStatus(initialStatus);
            prevMarketStatusRef.current = initialStatus.isOpen;
            statusInterval = setInterval(() => setMarketStatus(getMarketStatus()), 60000);

            // 2. Fetch/Load Brokerage Data based on market status
            try {
                if (initialStatus.isOpen) {
                    console.log("Market is open. Fetching live brokerage data...");
                    const [account, positions] = await Promise.all([getAccount(), getPositions()]);
                    setLiveAccount(account);
                    setLivePositions(positions);
                    await idbService.setAppState('liveAccount', account);
                    await idbService.setAppState('livePositions', positions);

                    websocketService.connect();
                    accountWebsocketService.connect();
                } else {
                    showNotification('Market is closed. Displaying last known data.', 'success');
                    console.log("Market is closed. Loading cached brokerage data...");
                    const [cachedAccount, cachedPositions] = await Promise.all([
                        idbService.getAppState<AlpacaAccount>('liveAccount'),
                        idbService.getAppState<AlpacaPosition[]>('livePositions')
                    ]);
                    if (cachedAccount) setLiveAccount(cachedAccount);
                    if (cachedPositions) setLivePositions(cachedPositions);
                }
            } catch (error) {
                console.error("Failed to initialize brokerage data:", error);
                const msg = error instanceof ApiKeyError ? error.message : "Could not connect to brokerage.";
                showNotification(msg, 'error');
            }

            // 3. Load other app state from IDB (runs regardless of market status)
            try {
                const todayStr = new Date().toISOString().split('T')[0];
                const [savedAppData, savedAppSettings, savedPropheciesData, savedWatchlist, savedChatHistory, savedNotifications, todaysBriefing] = await Promise.all([
                    idbService.getAppState<{ accounts: Record<string, JProfitAccount>, activeAccountId: string | null }>('appData'),
                    idbService.getAppState('appSettings'),
                    idbService.getAppState<Record<string, JeremiahProphecy>>('savedProphecies'),
                    idbService.getAppState<string[]>(WATCHLIST_KEY),
                    idbService.getAppState<Message[]>(CHAT_HISTORY_KEY),
                    idbService.getAppState<any[]>(NOTIFICATION_BUBBLES_KEY),
                    idbService.getAppState<any>(`dailyBriefing_${todayStr}`)
                ]);
                if (savedAppSettings) setAppSettings(savedAppSettings);
                if (savedPropheciesData) setSavedProphecies(savedPropheciesData);
                if (savedWatchlist) setWatchlist(savedWatchlist);
                if (savedChatHistory) setChatHistory(savedChatHistory);
                if (savedNotifications) setNotificationBubbles(savedNotifications);
                if (todaysBriefing) setDailyBriefing(todaysBriefing);

                if (savedAppData && Object.keys(savedAppData.accounts).length > 0) {
                    setAppData(savedAppData);
                } else {
                    const defaultAccountId = `sim_${Date.now()}`;
                    const defaultAccount: JProfitAccount = { id: defaultAccountId, name: 'My First Simulation', type: 'simulated', createdAt: new Date().toISOString(), initialCapital: 100000, buyingPower: 100000, portfolioValue: 100000, holdings: [], tradeHistory: [], botStrategy: 'Jeremiah', };
                    const newAppData = { accounts: { [defaultAccountId]: defaultAccount }, activeAccountId: defaultAccountId };
                    setAppData(newAppData);
                    await idbService.setAppState('appData', newAppData);
                }
            } catch(error) {
                console.error("Failed to load app state from IndexedDB:", error);
                showNotification('Failed to load saved app data.', 'error');
            }
        };

        initializeApp();

        return () => {
            websocketService.close();
            accountWebsocketService.close();
            if (statusInterval) clearInterval(statusInterval);
        };
    }, [keysReady, showNotification]);
    
    // NEW effect to handle market open transition and generate briefing
    useEffect(() => {
        const handleMarketOpen = async () => {
            const todayStr = new Date().toISOString().split('T')[0];
            const lastBriefingDate = await idbService.getAppState<string>('lastBriefingDate');

            if (lastBriefingDate !== todayStr) {
                console.log("Market is open and no briefing for today. Generating...");
                showNotification("AI Core is preparing the daily market briefing...", 'success');
                try {
                    const briefingData = await getDailyMarketBriefing();
                    setDailyBriefing(briefingData);
                    setIsBriefingOpen(true); // Automatically open the panel for the new briefing
                    await idbService.setAppState('lastBriefingDate', todayStr);
                    await idbService.setAppState(`dailyBriefing_${todayStr}`, briefingData);
                } catch (error) {
                    console.error("Failed to generate daily briefing:", error);
                    showNotification("Failed to generate the daily market briefing.", 'error');
                }
            }
        };

        if (keysReady && !prevMarketStatusRef.current && marketStatus.isOpen) {
            handleMarketOpen();
        }

        prevMarketStatusRef.current = marketStatus.isOpen;

    }, [marketStatus, keysReady, showNotification]);
    
    // Breaking News fetcher
    useEffect(() => {
        if (!keysReady) return;
        const fetchNews = async () => {
            try {
                const newsItem = await getBreakingMarketNews();
                if (newsItem && !breakingNews.some(n => n.headline === newsItem.headline)) {
                    setBreakingNews(prev => [...prev, { ...newsItem, id: Date.now() }]);
                }
            } catch (error) {
                console.error("Failed to fetch breaking news:", error);
            }
        };
        fetchNews();
        const interval = setInterval(fetchNews, 15 * 60 * 1000); // every 15 minutes
        return () => clearInterval(interval);
    }, [keysReady, breakingNews]);


    useEffect(() => { if (appData.accounts && Object.keys(appData.accounts).length > 0) idbService.setAppState('appData', appData); }, [appData]);
    useEffect(() => { idbService.setAppState('appSettings', appSettings); }, [appSettings]);
    useEffect(() => { idbService.setAppState('savedProphecies', savedProphecies); }, [savedProphecies]);
    useEffect(() => { localStorage.setItem(LAST_VIEWED_SYMBOL_KEY, currentSymbol); }, [currentSymbol]);
    useEffect(() => { idbService.setAppState(WATCHLIST_KEY, watchlist); }, [watchlist]);
    useEffect(() => { idbService.setAppState(CHAT_HISTORY_KEY, chatHistory); }, [chatHistory]);
    useEffect(() => { idbService.setAppState(NOTIFICATION_BUBBLES_KEY, notificationBubbles); }, [notificationBubbles]);
    
    const handleSymbolSelect = (symbol: string) => {
        setPreviousView(activeView === 'Symbol' ? previousView : activeView);
        setCurrentSymbol(symbol);
        setActiveView('Symbol');
    };
    const handleSymbolPageClose = () => {
        setActiveView(previousView);
    };
    const handleOpenMegaChart = (symbol: string) => { setDrawChartRequest({ symbol }); setIsMegaChartOpen(true); };

    const handleDrawChartRequest = (symbol: string, timeframe?: string, indicators?: string[]) => {
        setDrawChartRequest({ symbol, timeframe, indicators });
        setIsMegaChartOpen(true);
    };

    // --- Watchlist Handlers ---
    const handleAddToWatchlist = useCallback((symbol: string) => {
        if (!watchlist.includes(symbol)) {
            setWatchlist(prev => [symbol, ...prev]);
            showNotification(`${symbol} added to watchlist.`, 'success');
        }
    }, [watchlist, showNotification]);

    const handleRemoveFromWatchlist = (symbol: string) => {
        setWatchlist(prev => prev.filter(s => s !== symbol));
    };

    // --- News Bubble Handlers ---
    const handleConfirmNews = (id: number) => {
        setBreakingNews(prev => prev.filter(n => n.id !== id));
    };
    const handleStarNews = (symbols: string[]) => {
        symbols.forEach(handleAddToWatchlist);
    };

    // --- Account Management Handlers ---
    const handleCreateAccount = () => {
        const newAccountId = `sim_${Date.now()}`;
        const newAccount: JProfitAccount = {
            id: newAccountId, name: `Simulation ${Object.keys(appData.accounts).length + 1}`, type: 'simulated',
            createdAt: new Date().toISOString(), initialCapital: 100000, buyingPower: 100000,
            portfolioValue: 100000, holdings: [], tradeHistory: [], botStrategy: 'Jeremiah',
        };
        setAppData(prev => ({
            ...prev,
            accounts: { ...prev.accounts, [newAccountId]: newAccount }
        }));
        showNotification(`New account "${newAccount.name}" created.`, 'success');
    };
    const handleDeleteAccount = (accountId: string) => {
        if (Object.keys(appData.accounts).length <= 1 && activeAccountId !== 'brokerage') {
            showNotification("Cannot delete the only simulated account.", 'error');
            return;
        }
        if (activeAccountId === accountId) {
            showNotification("Cannot delete the active account. Please switch accounts first.", 'error');
            return;
        }
        setAppData(prev => {
            const newAccounts = { ...prev.accounts };
            delete newAccounts[accountId];
            return { ...prev, accounts: newAccounts };
        });
        showNotification(`Account deleted.`, 'success');
    };
    const handleResetAccount = (accountId: string) => {
        setAppData(prev => {
            const accountToReset = prev.accounts[accountId];
            if (!accountToReset) return prev;
            const newAccounts = {
                ...prev.accounts,
                [accountId]: {
                    ...accountToReset,
                    buyingPower: accountToReset.initialCapital,
                    portfolioValue: accountToReset.initialCapital,
                    holdings: [],
                    tradeHistory: [],
                }
            };
            return { ...prev, accounts: newAccounts };
        });
        showNotification(`Account "${appData.accounts[accountId]?.name}" has been reset.`, 'success');
    };
    
    const handleExecuteSimulatedTrade = useCallback(async (params: OrderParams, executionPrice?: number): Promise<{ success: boolean; error?: string }> => {
        if (activeAccountId === 'brokerage') return { success: false, error: 'Cannot execute simulated trade on brokerage account.' };
    
        let price;
        try {
            price = executionPrice ?? (await getLiveQuote(params.symbol)).price;
        } catch (error) {
            console.error("Failed to get live quote for simulated trade:", error);
            return { success: false, error: "Could not fetch current price to execute trade." };
        }
        
        const totalCost = price * params.qty;
    
        let success = true;
        let error: string | undefined;

        setAppData(prev => {
            const activeId = activeAccountId!;
            const account = { ...prev.accounts[activeId] };
            
            const newOrder: Order = {
                id: `ord_${Date.now()}`, timestamp: new Date().toISOString(), symbol: params.symbol,
                side: params.side === 'buy' ? 'Buy' : 'Sell',
                type: params.type.charAt(0).toUpperCase() + params.type.slice(1) as Order['type'],
                quantity: params.qty, status: 'Filled', limitPrice: price,
                timeInForce: params.time_in_force.toUpperCase() as Order['timeInForce']
            };
    
            if (params.side === 'buy') {
                if (account.buyingPower < totalCost) {
                    success = false; error = 'Insufficient buying power.';
                    return prev;
                }
                account.buyingPower -= totalCost;
                const existingHolding = account.holdings.find(h => h.symbol === params.symbol);
                if (existingHolding) {
                    const newTotalShares = existingHolding.shares + params.qty;
                    const newTotalCost = (existingHolding.avgCost * existingHolding.shares) + totalCost;
                    existingHolding.avgCost = newTotalCost / newTotalShares;
                    existingHolding.shares = newTotalShares;
                } else {
                    account.holdings.push({
                        id: `pos_${Date.now()}`, symbol: params.symbol, name: stockNameMap.get(params.symbol) || params.symbol,
                        shares: params.qty, avgCost: price, type: 'stock',
                    });
                }
            } else { // Sell
                const existingHolding = account.holdings.find(h => h.symbol === params.symbol);
                if (!existingHolding || existingHolding.shares < params.qty) {
                    success = false; error = 'Not enough shares to sell.';
                    return prev;
                }
                const realizedPL = (price - existingHolding.avgCost) * params.qty;
                newOrder.realizedPL = realizedPL;
                account.buyingPower += totalCost;
                account.portfolioValue += realizedPL;
                existingHolding.shares -= params.qty;
                if (existingHolding.shares === 0) {
                    account.holdings = account.holdings.filter(h => h.symbol !== params.symbol);
                }
            }
            
            account.tradeHistory = [newOrder, ...account.tradeHistory];
    
            return { ...prev, accounts: { ...prev.accounts, [activeId]: account } };
        });
    
        return { success, error };
    }, [activeAccountId]);

    const handlePartialConfigSave = (updates: Partial<JProfitConfig>) => {
        const newConfig = { ...apiKeys, ...updates };
        saveJProfitConfig(newConfig);
        setApiKeys(newConfig);
    };

    const handleUpdateActiveAccount = (updates: Partial<JProfitAccount>) => {
        if (activeAccount?.id && activeAccount.type === 'simulated') {
            setAppData(p => ({...p, accounts: {...p.accounts, [activeAccount.id!]: {...p.accounts[activeAccount.id!], ...updates}}}));
        }
    };

    const views: Record<string, React.ReactNode> = {
        'Portfolio': <Portfolio 
            account={activeAccount} 
            positions={activePositions} 
            onSymbolClick={handleSymbolSelect} 
            showNotification={showNotification}
            executeSimulatedTrade={handleExecuteSimulatedTrade}
            onUpdateAccount={handleUpdateActiveAccount}
            onOpenMegaChart={handleOpenMegaChart}
            createBrokerageOrder={createBrokerageOrder}
            onActivateVoice={() => setIsVoiceActivated(true)}
        />,
        'AI Core': <AICore 
            symbol={currentSymbol} 
            showNotification={showNotification} 
            setCurrentSymbol={handleSymbolSelect} 
            setActiveView={setActiveView} 
            chatHistory={chatHistory} 
            setChatHistory={setChatHistory}
            activeAccount={activeAccount}
            executeSimulatedTrade={handleExecuteSimulatedTrade}
            createBrokerageOrder={createBrokerageOrder}
            onDrawChartRequest={handleDrawChartRequest}
            isVoiceActivated={isVoiceActivated}
            setIsVoiceActivated={setIsVoiceActivated}
            appSettings={appSettings}
        />,
        'Market Intel': <MarketIntel onSymbolClick={handleSymbolSelect} showNotification={showNotification} symbol={currentSymbol} savedProphecies={savedProphecies} onSaveProphecy={(s,p)=>{setSavedProphecies(pr=>({...pr, [s]:p}));}} />,
        'Symbol': <SymbolPage symbol={currentSymbol} showNotification={showNotification} onOpenMegaChart={handleOpenMegaChart} onClose={handleSymbolPageClose} />,
        'Settings': <Settings 
            showNotification={showNotification} 
            simulatorSettings={{frequency: 60, duration: 60}} 
            setSimulatorSettings={() => {}} 
            appSettings={appSettings} 
            setAppSettings={setAppSettings} 
            appData={{...appData, activeAccountId: activeAccountId}} 
            onSwitchAccount={setActiveAccountId} 
            onUpdateAccount={(id, u) => setAppData(p => ({...p, accounts: {...p.accounts, [id]: {...p.accounts[id], ...u}}}))} 
            onCreateAccount={handleCreateAccount} 
            onDeleteAccount={handleDeleteAccount} 
            onResetAccount={handleResetAccount}
            apiKeys={apiKeys}
            onSaveApiKeys={handleSaveApiKeysForSettings}
            isSavingApiKeys={isSavingKeys}
            onPartialConfigSave={handlePartialConfigSave}
        />,
    };

    if (checkingInitialKeys) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[var(--background-dark)] text-white">
                <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Initializing...</span>
                </div>
            </div>
        );
    }
    
    if (!keysReady) {
        return <SplashScreen onLoginSuccess={() => setKeysReady(true)} />;
    }


    return (
        <div className="flex h-screen bg-transparent text-white font-sans overflow-hidden flex-col">
            <GlobalMoon view={activeView} containerStyle={moonContainerStyle} bodyStyle={moonBodyStyle} />
            <div className="global-world-clock">
                <WorldClock />
            </div>
            <SwipeableHeader
                activeView={activeView}
                setActiveView={setActiveView}
                marketStatus={marketStatus}
                allAccounts={allAccounts as any[]}
                activeAccount={activeAccount as any}
                onSwitchAccount={setActiveAccountId}
                onAccountStatusClick={() => setIsAccountAnalysisOpen(true)}
                hasBriefing={!!dailyBriefing}
                onOpenBriefing={() => setIsBriefingOpen(true)}
                isHeaderVisible={isHeaderVisible}
                setIsHeaderVisible={setIsHeaderVisible}
                onOpenChartLab={() => setIsChartLabOpen(true)}
            />
            
            <main className={`flex-1 overflow-y-auto p-4 md:p-6 bg-transparent relative z-10 transition-all duration-300 ${isHeaderVisible ? 'pt-[84px]' : 'pt-5'}`}>
                <div className="mx-auto max-w-screen-2xl h-full relative">
                    {Object.entries(views).map(([name, Component]) => (
                        <div key={name} style={{ display: activeView === name ? 'block' : 'none', height: '100%' }}>
                            {Component}
                        </div>
                    ))}
                </div>
            </main>
            
            <FloatingNewsManager items={breakingNews} onConfirm={handleConfirmNews} onStar={handleStarNews} />

            <NotificationBubbleManager bubbles={notificationBubbles} onDismiss={dismissNotification} onNavigate={handleSymbolSelect} />

            <AnimatePresence>
                {isChartLabOpen && (
                    <ChartLab 
                        onClose={() => setIsChartLabOpen(false)} 
                        showNotification={showNotification} 
                    />
                )}
                {isMegaChartOpen && drawChartRequest && ( 
                    <MegaChart 
                        key={drawChartRequest.symbol} 
                        symbol={drawChartRequest.symbol} 
                        initialIndicators={drawChartRequest.indicators}
                        onClose={() => setIsMegaChartOpen(false)} 
                    /> 
                )}
                {isAccountAnalysisOpen && (
                    <AccountAnalysisPanel 
                        account={activeAccount}
                        onClose={() => setIsAccountAnalysisOpen(false)}
                    />
                )}
                {isBriefingOpen && dailyBriefing && (
                    <DailyBriefingPanel
                        briefing={dailyBriefing.briefing}
                        sources={dailyBriefing.sources}
                        onClose={() => setIsBriefingOpen(false)}
                    />
                )}
            </AnimatePresence>

            <WatchlistDrawer
                watchlist={watchlist}
                onAdd={handleAddToWatchlist}
                onRemove={handleRemoveFromWatchlist}
                onSymbolClick={handleSymbolSelect}
                marketStatus={marketStatus}
            />
        </div>
    );
};

export default App;