import React, { useContext, useEffect, useMemo, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { 
  Users, BedDouble, Wallet, 
  Clock, Package, ArrowUpRight, 
  Zap, Bell, Search, Settings, Calendar,
  AlertCircle, CheckCircle2, ChevronRight,
  FileDown, X, Printer, BarChart3
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

  // --- STATE FOR REPORT DATE SELECTION ---
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

  // --- DASHBOARD DATA LOGIC ---
  const stats = useMemo(() => {
    const b = allBookings || [];
    const r = allRooms || [];

    const revenue = b
      .filter(book => book.paymentStatus === 'paid' || book.status === 'approved')
      .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);
    
    const occupiedCount = r.filter(room => room.available === false).length;
    const totalRooms = r.length || 1; 
    const occupancyRate = Math.round((occupiedCount / totalRooms) * 100);

    const pendingRequests = b.filter(book => 
      ["pending", "cancellation_pending"].includes(book.status)
    ).length;

    return {
      revenue,
      totalUsers: (allUsers || []).length,
      occupancy: occupiedCount,
      totalRooms: r.length,
      occupancyRate,
      pendingRequests,
    };
  }, [allRooms, allBookings, allUsers]);

  // --- MONTHLY REPORT LOGIC ---
  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const availableYears = useMemo(() => {
    const years = new Set((allBookings || []).map(b => {
      const d = new Date(b.check_in || b.date || b.createdAt);
      return d.getFullYear();
    }).filter(y => !isNaN(y)));
    
    years.add(new Date().getFullYear()); 
    return Array.from(years).sort((a, b) => b - a); 
  }, [allBookings]);

  const monthlyStats = useMemo(() => {
    const b = allBookings || [];

    // Filter bookings based on SELECTED month and year
    const monthlyBookings = b.filter(book => {
      const bookDate = new Date(book.check_in || book.date || book.createdAt);
      return bookDate.getMonth() === reportMonth && bookDate.getFullYear() === reportYear;
    });

    const totalIncome = monthlyBookings
      .filter(book => book.paymentStatus === 'paid' || book.status === 'approved')
      .reduce((sum, book) => sum + (Number(book.total_price || book.amount) || 0), 0);

    // ✅ LOGIC UPDATED: Total Guests is based exactly on the participants field
    const totalGuests = monthlyBookings.reduce((sum, book) => {
      const count = Array.isArray(book.participants) 
        ? book.participants.length 
        : (Number(book.participants) || 0);
      return sum + count;
    }, 0);

    const avgValue = monthlyBookings.length > 0 ? Math.round(totalIncome / monthlyBookings.length) : 0;

    return {
      totalBookings: monthlyBookings.length,
      totalIncome,
      totalGuests, // Keeps the label semantic but counts participants
      avgValue
    };
  }, [allBookings, reportMonth, reportYear]); 

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

      {/* --- PROFESSIONAL REPORT MODAL --- */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-slate-100 flex justify-between items-start print:pb-4 print:pt-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-indigo-600 p-2 rounded-xl print:hidden shadow-sm">
                    <BarChart3 size={20} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Monthly Summary Report</h2>
                </div>
                
                {/* --- DATE SELECTORS (Hidden when printing) --- */}
                <div className="flex flex-wrap items-center gap-3 mt-4 print:hidden">
                  <span className="text-slate-500 text-sm font-medium">Select Period:</span>
                  <div className="flex gap-2">
                    <select 
                      value={reportMonth} 
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm transition-all"
                    >
                      {monthNames.map((month, index) => (
                        <option key={index} value={index}>{month}</option>
                      ))}
                    </select>
                    <select 
                      value={reportYear} 
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm transition-all"
                    >
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* --- PRINT ONLY TEXT (Hidden on screen) --- */}
                <p className="text-slate-800 text-sm mt-2 hidden print:block font-bold">
                  Performance overview for {monthNames[reportMonth]} {reportYear}
                </p>
                <p className="text-slate-400 text-xs mt-2 hidden print:block font-medium">
                  Document generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </p>
              </div>

              <button 
                onClick={() => setShowReportModal(false)} 
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors print:hidden"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 bg-slate-50/50 flex-1 print:bg-white print:p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Highlighted Income Card (Spans full width) */}
                <div className="md:col-span-3 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                   <div className="absolute -top-6 -right-6 text-slate-50 opacity-50 transform rotate-12 transition-transform duration-500 group-hover:scale-110 print:hidden">
                      <Wallet size={160} />
                   </div>
                   <div className="relative z-10">
                     <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Total Gross Revenue</p>
                     <div className="flex items-end gap-4 flex-wrap">
                        <h3 className="text-5xl font-black text-slate-900 tracking-tighter">
                          ₱{monthlyStats.totalIncome.toLocaleString()}
                        </h3>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg mb-1.5">
                          Approved & Paid
                        </span>
                     </div>
                   </div>
                </div>

                {/* Secondary Stats Grid */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Bookings</p>
                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
                      <Calendar size={18} />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-slate-800">{monthlyStats.totalBookings}</h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Reservations logged</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-6">
                    {/* ✅ Display label shows "Total Guests" */}
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Guests</p>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
                      <Users size={18} />
                    </div>
                  </div>
                  <div>
                    {/* ✅ Value relies on the participants variable */}
                    <h4 className="text-3xl font-black text-slate-800">{monthlyStats.totalGuests}</h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Attendees recorded</p>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg. Order Value</p>
                    <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl">
                      <Wallet size={18} />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-slate-800">
                      ₱{monthlyStats.avgValue.toLocaleString()}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Per confirmed booking</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 print:hidden">
              <button 
                onClick={() => setShowReportModal(false)}
                className="px-6 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
              >
                Close Window
              </button>
              <button 
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95"
              >
                <Printer size={16} /> Export / Print PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {getGreeting()}, Admin
          </h1>
          <p className="text-slate-500 font-medium mt-1">Property Overview & Real-time Analytics</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          
          <button 
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <FileDown size={18} />
            Monthly Report
          </button>

          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl text-emerald-700 font-bold text-[10px] tracking-widest border border-emerald-100">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
               LIVE UPDATES
            </div>
            <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 relative">
              <Bell size={20} />
              {stats.pendingRequests > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- LEFT COLUMN --- */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard 
              label="Gross Revenue" 
              value={`₱${stats.revenue.toLocaleString()}`} 
              icon={<Wallet size={20} />}
              color="indigo"
              subValue="From paid bookings"
            />
            <StatCard 
              label="Action Required" 
              value={stats.pendingRequests} 
              icon={<AlertCircle size={20} />}
              color="rose"
              subValue="Pending approvals"
            />
            
            {/* Occupancy Card */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between">
               <div className="flex justify-between items-start">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <BedDouble size={20} />
                  </div>
                  <span className="text-2xl font-black text-slate-900">{stats.occupancyRate}%</span>
               </div>
               <div className="mt-4">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Occupancy</p>
                    <p className="text-[10px] text-slate-500 font-bold">{stats.occupancy}/{stats.totalRooms} Units</p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${stats.occupancyRate}%` }}
                    ></div>
                  </div>
               </div>
            </div>
          </div>

          {/* RECENT ACTIVITY TABLE */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="font-black text-slate-800 text-lg flex items-center gap-2 uppercase tracking-tight">
                <Clock size={18} className="text-indigo-500"/> Recent Bookings
              </h2>
              <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">
                Full History
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 text-[9px] uppercase font-black tracking-[0.15em]">
                  <tr>
                    <th className="px-6 py-4">Guest Profile</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(allBookings || []).slice(0, 5).map((booking, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200">
                             {booking.user_id?.image ? (
                                <img src={booking.user_id.image.startsWith('http') ? booking.user_id.image : `${backendUrl}/${booking.user_id.image}`} className="w-full h-full object-cover" alt="user" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                                    {booking.user_id?.firstName?.[0] || "G"}
                                </div>
                             )}
                          </div>
                          <div>
                            <p className="font-black text-slate-700 text-sm">{booking.user_id?.firstName} {booking.user_id?.lastName}</p>
                            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <Calendar size={10} /> {new Date(booking.check_in || booking.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-6 py-5 text-right font-black text-slate-800 text-sm">
                        ₱{Number(booking.total_price || booking.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN --- */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* QUICK ACTIONS */}
          <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-2xl shadow-indigo-100 overflow-hidden relative group">
             <div className="relative z-10">
                <h3 className="font-black text-xl mb-1 flex items-center gap-2 italic">
                    <Zap size={20} className="text-yellow-400 fill-yellow-400"/> EXPRESS ACCESS
                </h3>
                <p className="text-slate-400 text-xs mb-6 font-medium">Instantly manage property states.</p>
                <div className="space-y-3">
                    <SidebarButton 
                      icon={<Search size={18}/>} 
                      label="Availability Map" 
                      onClick={() => setIsCalendarOpen(true)}
                    />
                    <SidebarButton icon={<Users size={18}/>} label="Guest Directory" />
                    <SidebarButton icon={<Settings size={18}/>} label="System Config" />
                </div>
             </div>
             <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] group-hover:bg-indigo-600/30 transition-all duration-700"></div>
          </div>

          {/* POPULAR PACKAGES */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Package size={16} className="text-indigo-500"/> Catalog Highlights
            </h3>
            
            <div className="space-y-4">
                {(allPackages || []).slice(0, 3).map((pkg, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group cursor-pointer hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-4">
                         <div className="text-[10px] font-black text-indigo-400">#{i+1}</div>
                         <div>
                            <div className="text-xs font-black text-slate-700 group-hover:text-indigo-600 transition-colors">{pkg.name}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{pkg.duration || "Fixed Term"}</div>
                         </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                ))}
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
  };
  const activeTheme = themes[color] || themes.indigo;

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between h-40">
      <div className="flex justify-between items-start">
         <div className={`p-3 rounded-2xl border ${activeTheme}`}>
            {icon}
         </div>
      </div>
      <div>
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
        <p className="text-[10px] text-slate-400 font-bold mt-1">{subValue}</p>
      </div>
    </div>
  );
};

const SidebarButton = ({ icon, label, onClick }) => (
    <button 
      onClick={onClick} 
      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
    >
        <div className="flex items-center gap-4">
            <span className="text-slate-500 group-hover:text-yellow-400 transition-colors">{icon}</span>
            <span className="text-xs font-black text-slate-300 group-hover:text-white transition-colors uppercase tracking-widest">{label}</span>
        </div>
        <ArrowUpRight size={14} className="text-slate-600 group-hover:text-white" />
    </button>
);

const StatusBadge = ({ status }) => {
    let styles = "bg-slate-100 text-slate-500 border-slate-200";
    const s = (status || "").toLowerCase();

    if (["approved", "confirmed", "checked_in"].includes(s)) 
        styles = "bg-emerald-50 text-emerald-700 border-emerald-100";
    else if (s === 'pending' || s === 'cancellation_pending') 
        styles = "bg-amber-50 text-amber-700 border-amber-100";
    else if (["cancelled", "declined"].includes(s)) 
        styles = "bg-rose-50 text-rose-700 border-rose-100";

    return (
        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${styles} inline-flex items-center gap-2`}>
            <div className={`w-1 h-1 rounded-full bg-current`}></div>
            {status?.replace('_', ' ')}
        </span>
    );
};

export default Dashboard;