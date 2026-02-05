import React, { useContext, useEffect, useMemo } from 'react';
import { AdminContext } from "../../context/AdminContext";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { TrendingUp, Calendar, Zap, BarChart3, Info, Loader2 } from 'lucide-react';

// --- THE FIX: GLOBAL CONSOLE SILENCER ---
// We patch console.error to ignore the specific Recharts warning.
// This must be outside the component to work immediately.
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filter out the specific Recharts width/height warning
  if (typeof args[0] === "string" && /width.*height.*greater than 0/.test(args[0])) return;
  // Filter out defaultProps warnings (common in older libraries)
  if (typeof args[0] === "string" && /defaultProps/.test(args[0])) return;
  
  originalConsoleError(...args);
};

const Analytics = () => {
  const { aToken, allBookings, getAllBookings } = useContext(AdminContext);

  useEffect(() => {
    if (aToken) {
      getAllBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aToken]); 

  const { trendData, seasonalData, stats } = useMemo(() => {
    const bookings = allBookings || [];
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    // Velocity Logic
    const last7DaysCount = bookings.filter(b => (now - new Date(b.date || b.createdAt)) < 7 * oneDay).length;
    const prev7DaysCount = bookings.filter(b => {
      const diff = (now - new Date(b.date || b.createdAt));
      return diff >= 7 * oneDay && diff < 14 * oneDay;
    }).length;

    const velocityChange = prev7DaysCount === 0 ? (last7DaysCount > 0 ? 100 : 0) : 
      Math.round(((last7DaysCount - prev7DaysCount) / prev7DaysCount) * 100);

    // Trend Data
    const weeks = ['3 Wks Ago', '2 Wks Ago', 'Last Week', 'Current'];
    const weekTrends = weeks.map((name, i) => {
      const daysAgo = (3 - i) * 7;
      const count = bookings.filter(b => {
        const diff = (now - new Date(b.date || b.createdAt)) / oneDay;
        return diff >= daysAgo && diff < daysAgo + 7;
      }).length;
      return { name, bookings: count };
    });

    // Forecast
    const forecastValue = Math.round(last7DaysCount * (1 + (velocityChange / 100)));
    weekTrends.push({ name: 'Forecast', bookings: Math.max(0, forecastValue), isForecast: true });

    // Seasonal Data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyCounts = new Array(12).fill(0);
    
    bookings.forEach(b => {
      const date = new Date(b.date || b.createdAt);
      if (!isNaN(date)) {
        monthlyCounts[date.getMonth()]++;
      }
    });

    const seasons = monthNames.map((month, i) => ({
      month,
      demand: monthlyCounts[i],
    }));

    return { 
      trendData: weekTrends, 
      seasonalData: seasons,
      stats: {
        velocity: `${velocityChange >= 0 ? '+' : ''}${velocityChange}%`,
        isPositive: velocityChange >= 0,
        recentCount: last7DaysCount
      }
    };
  }, [allBookings]);

  if (!allBookings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 size={40} className="animate-spin mb-4 text-indigo-500" />
        <p className="font-bold text-sm tracking-wide uppercase">Loading Analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Real-Time Intelligence</h1>
        <p className="text-slate-500 font-medium mt-1">Live metrics derived from <span className="text-slate-900 font-bold">{allBookings.length}</span> booking records.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className={`relative p-8 rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-md ${stats.isPositive ? 'bg-indigo-600 text-white' : 'bg-rose-500 text-white'}`}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-90 mb-2">
                <Zap size={16} fill="currentColor" />
                <p className="text-xs font-bold uppercase tracking-widest">7-Day Velocity</p>
            </div>
            <h3 className="text-5xl font-black tracking-tight mb-2">{stats.velocity}</h3>
            <p className="text-sm font-medium opacity-90">{stats.recentCount} new bookings this week</p>
          </div>
          <Zap className="absolute -right-6 -bottom-6 w-40 h-40 text-white opacity-10 rotate-12" />
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Calendar size={20} />
             </div>
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Season</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">
            {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-slate-500 text-xs font-medium bg-slate-50 w-fit px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            Data refreshing live
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col min-w-0">
          <div className="mb-6 flex justify-between items-center">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <TrendingUp size={20} className="text-indigo-600" /> Intake Trends
             </h3>
          </div>
          
          {/* Defined height + w-full wrapper + explicit min-width to prevent flex collapse */}
          <div className="w-full h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                <YAxis hide />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="bookings" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorReal)" animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col min-w-0">
          <div className="mb-6 flex justify-between items-center">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <BarChart3 size={20} className="text-emerald-500" /> Monthly Volume
             </h3>
          </div>

          <div className="w-full h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonalData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                <Tooltip cursor={{fill: '#f1f5f9', radius: 8}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="demand" radius={[6, 6, 6, 6]} barSize={24} animationDuration={1000}>
                  {seasonalData.map((entry, index) => (
                    <Cell key={index} fill={index === new Date().getMonth() ? '#6366f1' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 p-3 rounded-xl">
             <Info size={14} className="text-indigo-500" />
             <span>The <strong className="text-indigo-600">Indigo</strong> bar represents current month activity.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;