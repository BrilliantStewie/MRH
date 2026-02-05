import React, { useContext, useEffect, useMemo, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import AvailabilityCalendar from "./AvailabilityCalendar"; // Ensure this path is correct
import { 
  Users, BedDouble, Wallet, 
  Clock, Package, ArrowUpRight, 
  Zap, Bell, Search, Settings, Calendar 
} from "lucide-react";

const Dashboard = () => {
  const { 
    aToken, allRooms, getAllRooms, 
    allBookings, getAllBookings, 
    allUsers, getAllUsers,
    allPackages, getAllPackages 
  } = useContext(AdminContext);

  // --- STATE FOR POPUP ---
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (aToken) {
      getAllRooms();
      getAllBookings();
      getAllUsers();
      getAllPackages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aToken]); 

  // --- STATS LOGIC ---
  const stats = useMemo(() => {
    const bookings = allBookings || [];
    const rooms = allRooms || [];

    // 1. Calculate Revenue (Confirmed or Paid)
    const revenue = bookings
      .filter(b => b.status === "confirmed" || b.payment === true)
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    
    // 2. Calculate Occupancy (Active Bookings)
    // We count a room as occupied if it has a confirmed/checked-in booking
    const occupiedCount = bookings.filter(b => 
       b.status === "confirmed" || b.status === "checked_in" || b.payment === true
    ).length;

    const totalRooms = rooms.length || 1; 
    
    // Cap occupancy rate at 100% just in case of data anomalies
    const rawRate = Math.round((occupiedCount / totalRooms) * 100);
    const occupancyRate = rawRate > 100 ? 100 : rawRate;

    return {
      revenue,
      totalUsers: (allUsers || []).length + 1, // +1 for admin
      occupancy: occupiedCount,
      totalRooms: rooms.length,
      occupancyRate,
      pendingActions: bookings.filter(b => ["pending", "cancellation_pending"].includes(b.status)).length,
    };
  }, [allRooms, allBookings, allUsers]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans">
      
      {/* --- MODAL POPUP --- */}
      <AvailabilityCalendar 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
        bookings={allBookings || []} 
      />

      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {getGreeting()}, Admin
          </h1>
          <p className="text-slate-500 font-medium mt-1">Here's what's happening at the property today.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl text-emerald-700 font-bold text-xs border border-emerald-100">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
             SYSTEM ONLINE
          </div>
          <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors">
            <Bell size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- LEFT COLUMN (MAIN CONTENT) --- */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* KPI GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard 
              label="Total Revenue" 
              value={`₱${stats.revenue.toLocaleString()}`} 
              icon={<Wallet size={20} />}
              color="indigo"
              trend="+12%"
            />
            <StatCard 
              label="Active Guests" 
              value={stats.totalUsers} 
              icon={<Users size={20} />}
              color="emerald"
              trend="+5%"
            />
            
            {/* Occupancy Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
               <div className="flex justify-between items-start">
                  <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
                    <BedDouble size={20} />
                  </div>
                  <span className="text-2xl font-black text-slate-900">{stats.occupancyRate}%</span>
               </div>
               <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Occupancy</p>
                    <p className="text-[10px] text-slate-500 font-medium">{stats.occupancy}/{stats.totalRooms} Booked</p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                        className="bg-orange-500 h-full rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${stats.occupancyRate}%` }}
                    ></div>
                  </div>
               </div>
            </div>
          </div>

          {/* RECENT BOOKINGS TABLE */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Clock size={18} className="text-slate-400"/> Recent Activity
              </h2>
              <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                View Report
              </button>
            </div>
            
            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Guest</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(allBookings || []).slice(0, 6).map((booking, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors cursor-default">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold border border-slate-200">
                             {booking.user_id?.name?.charAt(0) || "G"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 text-sm">{booking.user_id?.name || "Guest User"}</p>
                            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Calendar size={10} /> {booking.date ? new Date(booking.date).toLocaleDateString() : new Date().toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700">
                        ₱{Number(booking.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(allBookings || []).length === 0 && (
                     <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">No recent bookings found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN (SIDEBAR) --- */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* QUICK ACTIONS */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-200 overflow-hidden relative">
             <div className="relative z-10">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><Zap size={18} className="text-yellow-400 fill-yellow-400"/> Quick Actions</h3>
                <p className="text-slate-400 text-xs mb-5">Common management tasks.</p>
                <div className="space-y-2">
                    {/* BUTTON THAT OPENS THE CALENDAR */}
                    <SidebarButton 
                      icon={<Search size={16}/>} 
                      label="Check Availability" 
                      onClick={() => setIsCalendarOpen(true)}
                    />
                    
                    <SidebarButton icon={<Users size={16}/>} label="New Registration" />
                    <SidebarButton icon={<Settings size={16}/>} label="Maintenance Mode" />
                </div>
             </div>
             <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
          </div>

          {/* TOP PACKAGES */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                    <Package size={16} className="text-indigo-500"/> Popular Packages
                </h3>
            </div>
            
            <div className="space-y-3">
               {(allPackages || []).slice(0, 4).map((pkg, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                      <div className="flex items-center gap-3">
                         <div className="text-xs font-bold text-slate-300 w-4 group-hover:text-indigo-500 transition-colors">0{i+1}</div>
                         <div>
                            <div className="text-sm font-bold text-slate-700">{pkg.name}</div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 w-24">
                                 {pkg.description || "Standard inclusion"}
                            </div>
                         </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                        ₱{pkg.price}
                      </span>
                  </div>
               ))}
            </div>
            <button className="w-full mt-5 py-3 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-400 hover:text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-all">
                + Add New Package
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const StatCard = ({ label, value, icon, color, trend }) => {
  const styles = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  const activeStyle = styles[color] || styles.indigo;

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
         <div className={`p-2.5 rounded-xl border ${activeStyle}`}>
            {icon}
         </div>
         {trend && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-0.5">
               {trend} <ArrowUpRight size={10} />
            </span>
         )}
      </div>
      <div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
      </div>
    </div>
  );
};

const SidebarButton = ({ icon, label, onClick }) => (
    <button 
      onClick={onClick} 
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-left group"
    >
        <span className="text-slate-400 group-hover:text-white transition-colors">{icon}</span>
        <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{label}</span>
    </button>
);

const StatusBadge = ({ status }) => {
    let styles = "bg-slate-100 text-slate-500 border-slate-200";
    const s = (status || "").toLowerCase();

    if (s === 'confirmed' || s === 'checked_in') styles = "bg-emerald-50 text-emerald-700 border-emerald-100";
    else if (s === 'pending') styles = "bg-amber-50 text-amber-700 border-amber-100";
    else if (s === 'cancelled') styles = "bg-rose-50 text-rose-700 border-rose-100";

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${styles} inline-flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full bg-current opacity-60`}></span>
            {status}
        </span>
    );
};

export default Dashboard;