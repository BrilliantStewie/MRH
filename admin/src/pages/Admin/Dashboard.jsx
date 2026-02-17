import React, { useContext, useEffect, useMemo, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { 
  Users, BedDouble, Wallet, 
  Clock, Package, ArrowUpRight, 
  Zap, Bell, Search, Settings, Calendar,
  AlertCircle, CheckCircle2, ChevronRight
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

  useEffect(() => {
    if (aToken) {
      getAllRooms();
      getAllBookings();
      getAllUsers();
      getAllPackages();
    }
  }, [aToken]); 

  // --- REAL DATA LOGIC ---
  const stats = useMemo(() => {
    const b = allBookings || [];
    const r = allRooms || [];

    // 1. Revenue: Based on paid bookings
    const revenue = b
      .filter(book => book.paymentStatus === 'paid' || book.status === 'approved')
      .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);
    
    // 2. Occupancy: Count rooms that are currently in an active booking
    const occupiedCount = r.filter(room => room.available === false).length;
    const totalRooms = r.length || 1; 
    const occupancyRate = Math.round((occupiedCount / totalRooms) * 100);

    // 3. Pending Tasks: Things the admin needs to click
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

      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {getGreeting()}, Admin
          </h1>
          <p className="text-slate-500 font-medium mt-1">Property Overview & Real-time Analytics</p>
        </div>
        
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