import React, { useContext, useEffect, useMemo, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { 
  Users, BedDouble, Wallet, 
  Clock, Package, ArrowUpRight, 
  Zap, Bell, Search, Settings, Calendar,
  AlertCircle, CheckCircle2, ChevronRight,
  FileDown, X, Printer, BarChart3, TrendingUp, CalendarDays
} from "lucide-react";

const Dashboard = () => {
  const { 
    aToken, allRooms, getAllRooms, 
    allBookings, getAllBookings, 
    allUsers, getAllUsers,
    allPackages, getAllPackages,
    backendUrl 
  } = useContext(AdminContext);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // --- REPORT DATE & TYPE SELECTION ---
  const [reportType, setReportType] = useState("monthly"); // "monthly" | "yearly"
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (aToken) {
      getAllRooms();
      getAllBookings();
      getAllUsers();
      getAllPackages();
    }
  }, [aToken]); 

  // --- 1. DASHBOARD OVERVIEW DATA ---
  const stats = useMemo(() => {
    const b = allBookings || [];
    const r = allRooms || [];
    const currentDate = new Date();

    // Yearly Revenue (Current Year)
    const yearlyRevenue = b
      .filter(book => {
        if (book.paymentStatus !== 'paid' && book.status !== 'approved') return false;
        const d = new Date(book.check_in || book.date || book.createdAt);
        return d.getFullYear() === currentDate.getFullYear();
      })
      .reduce((acc, curr) => acc + (Number(curr.total_price || curr.amount) || 0), 0);
      
    // Monthly Income (Current Month)
    const monthlyIncome = b
      .filter(book => {
        if (book.paymentStatus !== 'paid' && book.status !== 'approved') return false;
        const d = new Date(book.check_in || book.date || book.createdAt);
        return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
      })
      .reduce((acc, curr) => acc + (Number(curr.total_price || curr.amount) || 0), 0);
    
    // Occupancy
    const occupiedCount = r.filter(room => room.available === false).length;
    const totalRooms = r.length || 1; 
    const occupancyRate = Math.round((occupiedCount / totalRooms) * 100);

    // Pending Actions
    const pendingBookings = b.filter(book => book.status === "pending");
    const pendingCancellations = b.filter(book => book.status === "cancellation_pending");
    const totalPending = pendingBookings.length + pendingCancellations.length;

    return {
      revenue: yearlyRevenue, 
      monthlyIncome,
      totalUsers: (allUsers || []).length,
      occupancy: occupiedCount,
      totalRooms: r.length,
      occupancyRate,
      pendingRequests: totalPending,
      pendingBookings: pendingBookings.length,
      pendingCancellations: pendingCancellations.length
    };
  }, [allRooms, allBookings, allUsers]);

  // --- 2. CHART DATA (LAST 6 MONTHS) ---
  const chartData = useMemo(() => {
    const months = [];
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const targetMonth = new Date(d.getFullYear(), d.getMonth() - i, 1);
        months.push({
            label: monthNamesShort[targetMonth.getMonth()],
            month: targetMonth.getMonth(),
            year: targetMonth.getFullYear(),
            revenue: 0
        });
    }

    (allBookings || []).forEach(b => {
        if (b.paymentStatus === 'paid' || b.status === 'approved') {
            const bDate = new Date(b.check_in || b.date || b.createdAt);
            const monthObj = months.find(m => m.month === bDate.getMonth() && m.year === bDate.getFullYear());
            if (monthObj) {
                monthObj.revenue += (Number(b.total_price || b.amount) || 0);
            }
        }
    });

    const maxRev = Math.max(...months.map(m => m.revenue), 1000); 
    return months.map(m => ({ ...m, height: Math.round((m.revenue / maxRev) * 100) }));
  }, [allBookings]);

  // --- 3. DYNAMIC REPORT LOGIC (MONTHLY OR YEARLY) ---
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const availableYears = useMemo(() => {
    const years = new Set((allBookings || []).map(b => new Date(b.check_in || b.date || b.createdAt).getFullYear()).filter(y => !isNaN(y)));
    years.add(new Date().getFullYear()); 
    return Array.from(years).sort((a, b) => b - a); 
  }, [allBookings]);

  const reportStats = useMemo(() => {
    const b = allBookings || [];
    const filteredBookings = b.filter(book => {
      const bookDate = new Date(book.check_in || book.date || book.createdAt);
      if (reportType === "monthly") {
        return bookDate.getMonth() === reportMonth && bookDate.getFullYear() === reportYear;
      } else {
        return bookDate.getFullYear() === reportYear;
      }
    });

    const totalIncome = filteredBookings
      .filter(book => book.paymentStatus === 'paid' || book.status === 'approved')
      .reduce((sum, book) => sum + (Number(book.total_price || book.amount) || 0), 0);

    const totalParticipants = filteredBookings.reduce((sum, book) => {
      const count = Array.isArray(book.participants) ? book.participants.length : (Number(book.participants) || 0);
      return sum + count;
    }, 0);

    return {
      totalBookings: filteredBookings.length,
      totalIncome,
      totalParticipants,
      avgValue: filteredBookings.length > 0 ? Math.round(totalIncome / filteredBookings.length) : 0
    };
  }, [allBookings, reportMonth, reportYear, reportType]); 

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-4 md:p-8 font-sans">
      
      <AvailabilityCalendar 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
        bookings={allBookings || []} 
      />

      {/* --- MODERN METRIC GRID REPORT --- */}
{showReportModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:block">
    
    {/* Action Bar */}
    <div className="fixed top-8 right-8 flex gap-3 print:hidden z-[110]">
      <button onClick={() => window.print()} className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-sm hover:bg-slate-700 transition-all flex items-center gap-2 shadow-xl">
        <Printer size={16} /> Print Report
      </button>
      <button onClick={() => setShowReportModal(false)} className="px-6 py-2.5 bg-white text-slate-900 rounded-full font-bold text-sm hover:bg-slate-100 transition-all shadow-xl">
        Close
      </button>
    </div>

    {/* A4 Paper */}
    <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-16 shadow-[0_20px_50px_rgba(0,0,0,0.1)] print:shadow-none print:p-8">
      
      {/* 1. Header */}
      <div className="flex justify-between items-start mb-16">
        <div>
           <div className="w-10 h-10 bg-slate-900 rounded-xl mb-4 flex items-center justify-center">
             <Zap className="text-white" size={20} />
           </div>
           <h1 className="text-3xl font-extrabold tracking-tighter text-slate-900">Performance Metrics</h1>
           <p className="text-slate-500 text-sm font-medium">Monthly Audit & Financial Review</p>
        </div>
        <div className="text-right border-l border-slate-200 pl-8">
           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date Range</p>
           <p className="text-lg font-bold text-slate-900">{reportType === "monthly" ? monthNames[reportMonth] : "Annual"}, {reportYear}</p>
        </div>
      </div>

      {/* 2. Hero Data */}
      <div className="bg-slate-50 rounded-3xl p-10 mb-8 border border-slate-100 print:bg-transparent print:border-none print:p-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Total Revenue Generated</p>
        <h2 className="text-6xl font-black text-slate-900 tracking-tighter">
          ₱{reportStats.totalIncome.toLocaleString()}
        </h2>
      </div>

      {/* 3. Metric Grid */}
      <div className="grid grid-cols-2 gap-4 mb-16">
        <div className="p-6 rounded-2xl border border-slate-100 bg-white">
           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Confirmed Bookings</p>
           <p className="text-2xl font-bold text-slate-900">{reportStats.totalBookings}</p>
        </div>
        <div className="p-6 rounded-2xl border border-slate-100 bg-white">
           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Guest Capacity</p>
           <p className="text-2xl font-bold text-slate-900">{reportStats.totalParticipants}</p>
        </div>
      </div>

      {/* 4. Data Table */}
      <div className="mb-16">
        <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Detailed Breakdown</h3>
        <table className="w-full">
           <thead>
             <tr className="text-[10px] uppercase text-slate-400 tracking-widest border-b border-slate-100">
               <th className="pb-4 text-left">Category</th>
               <th className="pb-4 text-right">Value</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
             <tr>
               <td className="py-4 text-sm font-medium text-slate-700">Gross Revenue</td>
               <td className="py-4 text-sm font-bold text-slate-900 text-right">₱{reportStats.totalIncome.toLocaleString()}</td>
             </tr>
             <tr>
               <td className="py-4 text-sm font-medium text-slate-700">Avg. Revenue/Booking</td>
               <td className="py-4 text-sm font-bold text-slate-900 text-right">₱{reportStats.avgValue.toLocaleString()}</td>
             </tr>
           </tbody>
        </table>
      </div>

      {/* 5. Footer */}
      <div className="mt-auto pt-8 border-t border-slate-100 flex justify-between items-center">
         <p className="text-[10px] font-bold text-slate-400">Vantage Management System</p>
         <div className="flex gap-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Page 01</p>
         </div>
      </div>

    </div>
  </div>
)}

      {/* --- TOP HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{getGreeting()}, Admin</h1>
          <p className="text-slate-500 font-medium mt-1">Property Overview & Real-time Analytics</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <FileDown size={18} /> Generate Report
          </button>

          {/* LIVE NOTIFICATIONS BELL */}
          <div className="relative flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl text-emerald-700 font-bold text-[10px] tracking-widest border border-emerald-100">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div> LIVE
            </div>
            
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 relative transition-colors focus:outline-none">
              <Bell size={20} className={stats.pendingRequests > 0 ? "text-slate-800" : ""} />
              {stats.pendingRequests > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-bounce"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Action Center</span>
                  <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-md">{stats.pendingRequests} New</span>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                  {stats.pendingRequests === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-400 font-medium">All caught up! No actions required.</div>
                  ) : (
                    <>
                      {stats.pendingBookings > 0 && (
                        <div className="p-3 hover:bg-slate-50 rounded-xl flex items-start gap-3 cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><CalendarDays size={16}/></div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">Pending Bookings</p>
                            <p className="text-xs text-slate-500 mt-0.5">You have {stats.pendingBookings} bookings awaiting approval.</p>
                          </div>
                        </div>
                      )}
                      {stats.pendingCancellations > 0 && (
                        <div className="p-3 hover:bg-slate-50 rounded-xl flex items-start gap-3 cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                          <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><AlertCircle size={16}/></div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">Cancellation Requests</p>
                            <p className="text-xs text-slate-500 mt-0.5">{stats.pendingCancellations} guests requested to cancel.</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- STATS GRID (4 Columns) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          label="Yearly Revenue" 
          value={`₱${stats.revenue.toLocaleString()}`} 
          icon={<Wallet size={20} />}
          color="slate"
          subValue={`For ${new Date().getFullYear()}`}
        />
        <StatCard 
          label="Monthly Income" 
          value={`₱${stats.monthlyIncome.toLocaleString()}`} 
          icon={<TrendingUp size={20} />}
          color="emerald"
          subValue={`For ${monthNames[new Date().getMonth()]}`}
        />
        <StatCard 
          label="Actions Required" 
          value={stats.pendingRequests} 
          icon={<AlertCircle size={20} />}
          color="rose"
          subValue="Pending approvals"
        />
        
        {/* Occupancy Card */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-36">
           <div className="flex justify-between items-start">
              <div className="p-2.5 rounded-[14px] bg-indigo-50 text-indigo-600 border border-indigo-100">
                <BedDouble size={20} />
              </div>
              <span className="text-2xl font-black text-slate-900">{stats.occupancyRate}%</span>
           </div>
           <div className="mt-2">
              <div className="flex justify-between items-end mb-2">
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Live Occupancy</p>
                <p className="text-[10px] text-slate-500 font-bold">{stats.occupancy}/{stats.totalRooms} Units</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.occupancyRate}%` }}></div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- LEFT COLUMN: REVENUE CHART --- */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 h-full flex flex-col justify-between min-h-[320px]">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="font-black text-slate-800 text-lg flex items-center gap-2 uppercase tracking-tight">
                  <BarChart3 size={18} className="text-emerald-500"/> Income Overview
                </h2>
                <p className="text-slate-400 text-xs font-medium mt-1">Gross revenue over the last 6 months</p>
              </div>
            </div>

            {/* Custom CSS Flexbox Bar Chart */}
            <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 relative pt-4 mt-auto">
              {/* Horizontal Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full border-t border-slate-100 border-dashed h-0"></div>
                ))}
              </div>
              
              {chartData.map((data, i) => (
                <div key={i} className="flex flex-col items-center flex-1 z-10 group cursor-pointer h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 bg-slate-800 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap">
                    ₱{data.revenue.toLocaleString()}
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full max-w-[48px] bg-indigo-50 group-hover:bg-indigo-500 rounded-t-xl transition-all duration-500 relative overflow-hidden"
                    style={{ height: `${Math.max(data.height, 8)}%` }}
                  >
                    <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-indigo-200 to-transparent group-hover:from-indigo-600"></div>
                  </div>
                  {/* Label */}
                  <span className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                    {data.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN: LIGHT THEMED AVAILABILITY WIDGET --- */}
        <div className="lg:col-span-5 flex">
          <div className="bg-white w-full rounded-[32px] p-8 relative overflow-hidden shadow-sm border border-slate-200 flex flex-col justify-between min-h-[320px] group hover:border-indigo-200 transition-colors duration-300">
            
            {/* Soft abstract glowing background elements for light theme */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/80 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 transition-transform duration-700 group-hover:scale-110 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-50/60 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

            {/* Top Row: Icon & Badge */}
            <div className="relative z-10 flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center shadow-sm">
                <CalendarDays size={28} className="text-indigo-600" />
              </div>
              <span className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-[9px] font-bold uppercase tracking-widest border border-slate-200 text-slate-500 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                Management
              </span>
            </div>
            
            {/* Bottom Row: Text & CTA Button */}
            <div className="relative z-10 mt-auto">
              <h3 className="text-3xl font-black tracking-tight mb-2 text-slate-900">Availability Map</h3>
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed max-w-[90%]">
                Visually track room occupancies, manage upcoming reservations, and block out dates across all properties instantly.
              </p>

              <button 
                onClick={() => setIsCalendarOpen(true)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-[0_8px_20px_rgba(79,70,229,0.25)] flex items-center justify-between px-6 group/btn active:scale-95"
              >
                <span>Open Master Calendar</span>
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover/btn:bg-white group-hover/btn:text-indigo-600 transition-colors">
                  <ArrowUpRight size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const StatCard = ({ label, value, icon, color, subValue }) => {
  const themes = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  const activeTheme = themes[color] || themes.indigo;

  return (
    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group hover:border-slate-200 transition-colors">
      <div className="flex justify-between items-start relative z-10">
         <div className={`p-2.5 rounded-[14px] border transition-transform duration-300 group-hover:scale-110 ${activeTheme}`}>
            {icon}
         </div>
      </div>
      <div className="relative z-10">
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight truncate">{value}</h3>
        <p className="text-[10px] text-slate-400 font-bold mt-1 truncate">{subValue}</p>
      </div>
    </div>
  );
};

export default Dashboard;