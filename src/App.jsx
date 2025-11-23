import React, { useState, useEffect, useMemo } from 'react';
import { Activity, DollarSign, TrendingUp, TrendingDown, Clock, ArrowUpDown, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip as RechartsTooltip } from 'recharts';

// API
const API_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=15&page=1&sparkline=true&price_change_percentage=24h";

// ФОРМАТУВАННЯ
const formatUSD = (num) => new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(num);
const formatPct = (num) => `${num > 0 ? '+' : ''}${num?.toFixed(2)}%`;
// Спрощуємо великі цифри для людей
const formatVolume = (num) => {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)} Млрд`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)} Млн`;
  return `$${num}`;
};

// КАЛЬКУЛЯТОР
const ProfitCalculator = ({ selectedCoin, onClose }) => {
  const [investment, setInvestment] = useState(100);
  const [targetProfit, setTargetProfit] = useState(20);
  const [feeRate, setFeeRate] = useState(0.1); 

  // Розрахунок: скільки треба отримати "брудними", щоб перекрити комісію на вхід і вихід
  const calculateExit = () => {
    if (!selectedCoin) return 0;
    // Скільки монет ми купили (віднімаємо комісію на вхід)
    const amountCoins = (investment * (1 - feeRate / 100)) / selectedCoin.current_price;
    // Скільки грошей нам треба в кінці (вкладене + прибуток)
    const totalNeeded = investment + parseFloat(targetProfit);
    // Яка сума має бути до зняття комісії на вихід
    const grossNeeded = totalNeeded / (1 - feeRate / 100); 
    // Яка ціна однієї монети для цього потрібна
    const requiredPrice = grossNeeded / amountCoins;
    return requiredPrice;
  };

  const exitPrice = calculateExit();
  const priceChangeReq = ((exitPrice - selectedCoin.current_price) / selectedCoin.current_price) * 100;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md z-50 transition-all">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white bg-slate-800 rounded-full p-2 transition">✕</button>
        
        <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          💰 Калькулятор Прибутку
        </h3>
        <p className="text-slate-400 text-sm mb-6">Розрахуй, коли продавати {selectedCoin.name}, щоб реально заробити.</p>
        
        <div className="space-y-5">
          {/* Блок введення даних */}
          <div className="bg-slate-800/50 p-4 rounded-xl space-y-4">
             <div>
               <label className="text-xs text-blue-300 font-bold uppercase mb-1 block">1. Скільки грошей вкладаєш? ($)</label>
               <input type="number" value={investment} onChange={(e) => setInvestment(parseFloat(e.target.value))} className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none font-bold text-lg" />
             </div>
             
             <div>
               <label className="text-xs text-green-300 font-bold uppercase mb-1 block">2. Скільки хочеш заробити чистими? ($)</label>
               <input type="number" value={targetProfit} onChange={(e) => setTargetProfit(parseFloat(e.target.value))} className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-700 focus:border-green-500 outline-none font-bold text-lg" />
             </div>

             <div>
               <label className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                 3. Комісія біржі (%) <Info size={12}/>
               </label>
               <div className="flex items-center gap-2">
                 <input type="number" value={feeRate} onChange={(e) => setFeeRate(parseFloat(e.target.value))} className="w-20 bg-slate-900 text-slate-300 p-2 rounded-lg border border-slate-700 text-center text-sm" />
                 <span className="text-[10px] text-slate-500 leading-tight">Зазвичай Binance/Bybit беруть 0.1%. <br/>Вираховується автоматично.</span>
               </div>
             </div>
          </div>

          {/* Результат */}
          <div className="bg-gradient-to-r from-blue-900/40 to-slate-900 border border-blue-500/30 p-5 rounded-xl text-center">
            <div className="text-slate-300 text-sm mb-1 uppercase font-bold tracking-widest">Твоя ціль (Ціна продажу)</div>
            <div className="text-4xl font-mono font-bold text-white mb-2 drop-shadow-lg">{formatUSD(exitPrice || 0)}</div>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${priceChangeReq > 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
               Потрібен ріст монети: {formatPct(priceChangeReq || 0)}
            </div>
          </div>
          
          <div className="text-xs text-slate-500 text-center">
            * Калькулятор вже вирахував, що біржа вирахує частину прибутку при купівлі та продажу. Цифра вище — це "чиста" ціль.
          </div>
        </div>

        <button onClick={onClose} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-blue-900/20">
          Ок🚀
        </button>
      </div>
    </div>
  );
};

// --- ГРАФІК З ВИБОРОМ ЧАСУ ---
// --- ГРАФІК З ВИБОРОМ ЧАСУ (ВИПРАВЛЕНО НАКЛАДАННЯ) ---
const LiveChartCard = ({ activeCoin }) => {
  const [timeRange, setTimeRange] = useState('7D');

  if (!activeCoin || !activeCoin.sparkline_in_7d) return <div className="h-[350px] bg-slate-900 rounded-2xl animate-pulse border border-slate-800"></div>;

  const isBullish = activeCoin.price_change_percentage_24h >= 0;
  const color = isBullish ? "#22c55e" : "#ef4444"; 

  const chartData = useMemo(() => {
    const fullData = activeCoin.sparkline_in_7d.price.map((price, index) => ({ index, price }));
    if (timeRange === '24H') return fullData.slice(-24); 
    if (timeRange === '3D') return fullData.slice(-72);  
    return fullData; 
  }, [activeCoin, timeRange]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl relative group h-[380px] flex flex-col">
      {/* ЗАМІНИЛИ HEADER: Додали flex-wrap та зменшили відступи, щоб не налізало */}
      <div className="p-4 border-b border-slate-800/50 flex flex-wrap justify-between items-center bg-slate-900/95 backdrop-blur-sm z-10 gap-y-3 gap-x-2">
        
        {/* Блок з інфо про монету */}
        <div className="flex items-center gap-3 min-w-0">
            <img src={activeCoin.image} alt={activeCoin.name} className="w-10 h-10 rounded-full shadow-lg shrink-0" />
            <div className="whitespace-nowrap">
                <h2 className="font-bold text-lg text-white leading-tight truncate">
                    {activeCoin.name}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-base font-mono font-bold text-slate-200">{formatUSD(activeCoin.current_price)}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isBullish ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {formatPct(activeCoin.price_change_percentage_24h)}
                    </span>
                </div>
            </div>
        </div>
        
        {/* Блок кнопок (shrink-0 не дає їм сплющуватись, ml-auto притискає вправо) */}
        <div className="flex bg-slate-800 p-0.5 rounded-lg shrink-0 ml-auto sm:ml-0">
            {[
                {k: '24H', l: '24 Г'}, 
                {k: '3D', l: '3 Дн'}, 
                {k: '7D', l: '7 Дн'}
            ].map((btn) => (
                <button 
                    key={btn.k}
                    onClick={() => setTimeRange(btn.k)}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-all min-w-[35px] ${
                        timeRange === btn.k 
                        ? 'bg-slate-600 text-white shadow' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                >
                    {btn.l}
                </button>
            ))}
        </div>
      </div>

      <div className="flex-1 w-full relative">
         <svg style={{ height: 0, width: 0, position: 'absolute' }}>
          <defs>
            <linearGradient id="colorPriceUp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPriceDown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
        </svg>

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <YAxis domain={['auto', 'auto']} hide={true} />
            <RechartsTooltip 
                content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                    return (
                        <div className="bg-slate-800 border border-slate-700 p-2 rounded shadow-xl text-xs font-mono text-white">
                            {formatUSD(payload[0].value)}
                        </div>
                    );
                    }
                    return null;
                }}
             />
            <Area type="monotone" dataKey="price" stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#${isBullish ? 'colorPriceUp' : 'colorPriceDown'})`} animationDuration={500} />
          </AreaChart>
        </ResponsiveContainer>
        
        <div className="absolute bottom-3 right-5 text-[10px] text-slate-600 font-bold uppercase tracking-widest flex items-center gap-1">
            <Clock size={10} /> {timeRange}
        </div>
      </div>
    </div>
  );
};

// --- ТОП РОСТУ / ПАДІННЯ ---
const MoversAndShakers = ({ coins }) => {
  const { gainers, losers } = useMemo(() => {
    if (coins.length === 0) return { gainers: [], losers: [] };
    const sorted = [...coins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
    return {
        gainers: sorted.slice(0, 3),
        losers: sorted.slice(-3).reverse()
    };
  }, [coins]);

  const CompactRow = ({ item, isGainer }) => (
      <div className="flex justify-between items-center py-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 px-2 rounded transition cursor-help" title={isGainer ? "Ціна сильно виросла" : "Ціна сильно впала"}>
          <div className="flex items-center gap-2">
            <img src={item.image} alt={item.symbol} className="w-6 h-6 rounded-full" />
            <span className="font-bold text-xs text-white">{item.symbol.toUpperCase()}</span>
          </div>
          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${isGainer ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {formatPct(item.price_change_percentage_24h)}
          </span>
      </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full">
             <div className="text-xs text-green-400 font-bold uppercase mb-3 flex items-center gap-2 pb-2 border-b border-slate-800">
                 <TrendingUp size={16} /> Лідери Росту 🚀
             </div>
             <div className="flex-1">{gainers.map(coin => <CompactRow key={coin.id} item={coin} isGainer={true} />)}</div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full">
             <div className="text-xs text-red-400 font-bold uppercase mb-3 flex items-center gap-2 pb-2 border-b border-slate-800">
                 <TrendingDown size={16} /> Лідери Падіння 🔻
             </div>
             <div className="flex-1">{losers.map(coin => <CompactRow key={coin.id} item={coin} isGainer={false} />)}</div>
        </div>
    </div>
  );
};

// --- ГОЛОВНИЙ ДОДАТОК ---
export default function CryptoDashboard() {
  const [coins, setCoins] = useState([]);
  const [activeCoinForChart, setActiveCoinForChart] = useState(null); 
  const [selectedCoinForModal, setSelectedCoinForModal] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [sortBy, setSortBy] = useState('default'); // 'default' (MarketCap) or 'volatility' (Heat)

  const fetchData = async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      
      const processedData = data.map(coin => ({
        ...coin,
        // Heat Index - наша вигадана метрика активності
        heatIndex: (coin.total_volume / coin.market_cap) * 100 
      }));
      setCoins(processedData);

      if (!activeCoinForChart && processedData.length > 0) {
          setActiveCoinForChart(processedData[0]);
      } else if (activeCoinForChart) {
          const updatedActive = processedData.find(c => c.id === activeCoinForChart.id);
          if (updatedActive) setActiveCoinForChart(updatedActive);
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchData(); 
    const interval = setInterval(() => {
      if (!isPaused && !selectedCoinForModal) fetchData();
    }, 15000);
    return () => clearInterval(interval);
  }, [isPaused, selectedCoinForModal, activeCoinForChart]); 

  // Сортування
  const displayedCoins = useMemo(() => {
    let sorted = [...coins];
    if (sortBy === 'volatility') {
        sorted.sort((a, b) => b.heatIndex - a.heatIndex);
    }
    return sorted;
  }, [coins, sortBy]);

  // Функція визначення "Поради"
  const getSignal = (coin) => {
      if (coin.price_change_percentage_24h < -2) return { text: "Знижка", color: "text-green-400 bg-green-900/30", icon: <CheckCircle size={12}/> };
      if (coin.price_change_percentage_24h > 5) return { text: "Пік ціни", color: "text-red-400 bg-red-900/30", icon: <AlertTriangle size={12}/> };
      return { text: "Спокійно", color: "text-slate-400 bg-slate-800", icon: null };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-6 lg:p-8 flex flex-col">
      <header className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Activity className="text-blue-500" size={32} /> КРИПТО РАДАР
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-10"></p>
        </div>
        
        {/* Перемикач сортування */}
        <div className="bg-slate-900 p-1 rounded-lg flex items-center border border-slate-800">
            <button 
                onClick={() => setSortBy('default')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${sortBy === 'default' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                За капіталізацією
            </button>
            <button 
                onClick={() => setSortBy('volatility')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${sortBy === 'volatility' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <TrendingUp size={14} /> Найгарячіші (Топ торгів)
            </button>
        </div>
      </header>

      {/* ОСНОВНА СІТКА */}
      <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 grow">
        
        {/* ЛІВА КОЛОНКА: ТАБЛИЦЯ (8 частин) */}
        <div 
          className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[650px]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 shrink-0">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
                Ринок наживо 
                {isPaused && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 animate-pulse">Пауза при наведенні</span>}
            </h2>
            <div className="text-xs text-slate-500 flex items-center gap-2">
                 <ArrowUpDown size={14} /> Сортування: {sortBy === 'default' ? 'Топ за грошима' : 'Топ за активністю'}
            </div>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar grow">
            <table className="w-full text-left text-sm relative border-collapse">
              <thead className="bg-slate-800/90 text-slate-400 font-bold uppercase text-xs sticky top-0 backdrop-blur-md z-10 shadow-sm">
                <tr>
                  <th className="p-4">Монета / Активність</th>
                  <th className="p-4 text-right">Ціна (USD)</th>
                  <th className="p-4 text-right">Зміна 24г</th>
                  <th className="p-4 text-center hidden sm:table-cell">Сигнал</th>
                  <th className="p-4 text-right">Інструменти</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {displayedCoins.map((coin) => {
                  const isActive = activeCoinForChart?.id === coin.id;
                  const signal = getSignal(coin);
                  return (
                  <tr 
                    key={coin.id} 
                    onClick={() => setActiveCoinForChart(coin)}
                    className={`hover:bg-blue-900/10 transition cursor-pointer group ${isActive ? 'bg-blue-900/20 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                  >
                    <td className="p-4 flex items-center gap-3">
                      <div className="relative">
                          <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full bg-white/10" />
                          <div className="absolute -bottom-1 -right-1 bg-slate-800 text-[9px] text-slate-400 border border-slate-700 rounded px-1">
                              #{coin.market_cap_rank}
                          </div>
                      </div>
                      <div>
                        <div className={`font-bold text-base ${isActive ? 'text-blue-400' : 'text-white'}`}>{coin.symbol.toUpperCase()}</div>
                        {/* ЗРОЗУМІЛИЙ ТЕКСТ ПРО ОБ'ЄМ */}
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            🔥 Торги: <span className="text-slate-300">{formatVolume(coin.total_volume)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-white text-[15px] font-bold tracking-tight">
                      {formatUSD(coin.current_price)}
                    </td>
                    <td className="p-4 text-right">
                       <div className={`inline-flex items-center gap-1 font-bold ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {coin.price_change_percentage_24h >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                          {formatPct(coin.price_change_percentage_24h)}
                       </div>
                    </td>
                    <td className="p-4 text-center hidden sm:table-cell">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border border-white/5 inline-flex items-center gap-1 ${signal.color}`}>
                            {signal.icon} {signal.text}
                        </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedCoinForModal(coin); }} 
                        className="bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-400 px-4 py-2 rounded-lg text-xs font-bold transition border border-blue-600/30 hover:border-blue-500 shadow-sm"
                      >
                        Калькулятор
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

        {/* ПРАВА КОЛОНКА: ГРАФІК ТА СТАТИСТИКА (4 частини) */}
        <div className="lg:col-span-4 flex flex-col h-[650px] gap-6">
           <div className="shrink-0">
             {activeCoinForChart && <LiveChartCard activeCoin={activeCoinForChart} />}
           </div>
           
           <div className="grow overflow-hidden">
              {coins.length > 0 && <MoversAndShakers coins={coins} />}
           </div>
        </div>
      </main>

      {}
      <footer className="max-w-7xl mx-auto mt-8 border-t border-slate-800 pt-6 pb-4 text-center">
          <p className="text-slate-500 text-sm leading-relaxed max-w-2xl mx-auto">
            <span className="text-white font-bold">Радар по крипті.</span> Зліва — монети, які зараз рухаються (червоне — знижка, зелене — профіт). 
             Справа — графік, щоб бачити куди все летить. Юзай кнопку <span className="text-blue-400 font-bold">"Калькулятор"</span>, щоб біржа не з'їла твої гроші на комісіях, і ти знатимеш коли вигідно продати свої монети.
          </p>
      </footer>

      {}
      {selectedCoinForModal && <ProfitCalculator selectedCoin={selectedCoinForModal} onClose={() => setSelectedCoinForModal(null)} />}
    </div>
  );
}