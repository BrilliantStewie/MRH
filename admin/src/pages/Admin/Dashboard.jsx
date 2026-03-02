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

      {/* --- REPORT MODAL --- */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="px-8 pt-8 pb-6 border-b border-slate-100 flex justify-between items-start print:pb-4 print:pt-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-indigo-600 p-2 rounded-xl print:hidden shadow-sm">
                    <BarChart3 size={20} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {reportType === "monthly" ? "Monthly" : "Yearly"} Summary Report
                  </h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 mt-4 print:hidden">
                  <span className="text-slate-500 text-sm font-medium">Select Period:</span>
                  <div className="flex gap-2">
                    <select 
                      value={reportType} 
                      onChange={(e) => setReportType(e.target.value)} 
                      className="bg-indigo-50 text-indigo-700 font-black rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all border-none"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>

                    {reportType === "monthly" && (
                      <select 
                        value={reportMonth} 
                        onChange={(e) => setReportMonth(Number(e.target.value))} 
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-500 cursor-pointer transition-all"
                      >
                        {monthNames.map((month, index) => <option key={index} value={index}>{month}</option>)}
                      </select>
                    )}

                    <select 
                      value={reportYear} 
                      onChange={(e) => setReportYear(Number(e.target.value))} 
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-500 cursor-pointer transition-all"
                    >
                      {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                </div>

                <p className="text-slate-800 text-sm mt-2 hidden print:block font-bold">
                  Performance overview for {reportType === "monthly" ? `${monthNames[reportMonth]} ` : ""}{reportYear}
                </p>
                <p className="text-slate-400 text-xs mt-2 hidden print:block font-medium">Document generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors print:hidden">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 bg-slate-50/50 flex-1 print:bg-white print:p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                   <div className="absolute -top-6 -right-6 text-slate-50 opacity-50 transform rotate-12 transition-transform duration-500 group-hover:scale-110 print:hidden"><Wallet size={160} /></div>
                   <div className="relative z-10">
                     <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Total Gross Revenue</p>
                     <div className="flex items-end gap-4 flex-wrap">
                        <h3 className="text-5xl font-black text-slate-900 tracking-tighter">₱{reportStats.totalIncome.toLocaleString()}</h3>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg mb-1.5">Approved & Paid</span>
                     </div>
                   </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Bookings</p>
                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl"><Calendar size={18} /></div>
                  </div>
                  <div><h4 className="text-3xl font-black text-slate-800">{reportStats.totalBookings}</h4><p className="text-xs text-slate-500 mt-1 font-medium">Reservations logged</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Participants</p>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl"><Users size={18} /></div>
                  </div>
                  <div><h4 className="text-3xl font-black text-slate-800">{reportStats.totalParticipants}</h4><p className="text-xs text-slate-500 mt-1 font-medium">Attendees recorded</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg. Order Value</p>
                    <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl"><TrendingUp size={18} /></div>
                  </div>
                  <div><h4 className="text-3xl font-black text-slate-800">₱{reportStats.avgValue.toLocaleString()}</h4><p className="text-xs text-slate-500 mt-1 font-medium">Per confirmed booking</p></div>
                </div>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 print:hidden">
              <button onClick={() => setShowReportModal(false)} className="px-6 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all">Close Window</button>
              <button onClick={() => window.print()} className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95"><Printer size={16} /> Export / Print PDF</button>
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