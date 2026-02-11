import React, { useContext, useEffect, useMemo, useState } from "react";
import { StaffContext } from "../../context/StaffContext";
import axios from "axios";
import { 
  Users, BedDouble, Wallet, 
  Clock, ArrowUpRight, 
  Zap, Bell, Search, Settings, Calendar,
  TrendingUp, Moon
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { toast } from "react-toastify";

const StaffDashboard = () => {
  const { backendUrl, sToken } = useContext(StaffContext);
  
  // State for raw data
  const [allBookings, setAllBookings] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Fetch real data on component mount
  useEffect(() => {
    const fetchOperationalData = async () => {
      try {
        const headers = { token: sToken };
        const [bookingsRes, roomsRes, usersRes] = await Promise.all([
          axios.get(`${backendUrl}/api/staff/bookings`, { headers }),
          axios.get(`${backendUrl}/api/staff/rooms`, { headers }),
          axios.get(`${backendUrl}/api/staff/users`, { headers })
        ]);

        if (bookingsRes.data.success) setAllBookings(bookingsRes.data.bookings);
        if (roomsRes.data.success) setAllRooms(roomsRes.data.rooms);
        if (usersRes.data.success) setAllUsers(usersRes.data.users);
      } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        toast.error("Failed to sync live data");
      }
    };

    if (sToken) fetchOperationalData();
  }, [sToken, backendUrl]);

  // --- REAL-TIME CALCULATIONS (Refined from Admin Logic) ---
  const stats = useMemo(() => {
    const bookings = allBookings || [];
    const rooms = allRooms || [];

    // 1. Calculate Revenue (Total from confirmed/paid)
    const revenue = bookings
      .filter(b => b.status === "approved" || b.paymentStatus === "paid")
      .reduce((acc, curr) => acc + (Number(curr.total_price || curr.amount) || 0), 0);
    
    // 2. Occupancy Calculations
    const occupiedCount = bookings.filter(b => 
       b.status === "approved" && b.paymentStatus === "paid"
    ).length;

    const totalRooms = rooms.length || 1; 
    const occupancyRate = Math.min(Math.round((occupiedCount / totalRooms) * 100), 100);

    return {
      revenue,
      totalGuests: (allUsers || []).length,
      occupancy: occupiedCount,
      totalRooms: totalRooms,
      occupancyRate,
    };
  }, [allBookings, allRooms, allUsers]);

  // Chart data derived from real bookings (Grouped by Day)
  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dataMap = days.map(day => ({ name: day, bookings: 0 }));
    
    allBookings.slice(0, 50).forEach(b => {
      const dayIndex = new Date(b.slotDate || b.date).getDay();
      dataMap[dayIndex].bookings += 1;
    });
    
    return dataMap;
  }, [allBookings]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {getGreeting()}, Staff
          </h1>
          <p className="text-slate-500 font-medium mt-1">Live operational data for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl text-indigo-700 font-bold text-xs border border-indigo-100">
             <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
             STAFF TERMINAL ACTIVE
          </div>
          <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors">
            <Bell size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- LEFT COLUMN --- */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard 
              label="Approved Revenue" 
              value={`₱${stats.revenue.toLocaleString()}`} 
              icon={<Wallet size={20} />}
              color="indigo"
              trend="+12%"
            />
            <StatCard 
              label="Registered Guests" 
              value={stats.totalGuests} 
              icon={<Users size={20} />}
              color="emerald"
              trend="+5%"
            />
            
            {/* Real-time Occupancy Card */}
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

          {/* REAL PERFORMANCE CHART */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-500"/> Activity Trends
              </h2>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorInd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5F6FFF" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#5F6FFF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#cbd5e1'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#cbd5e1'}} />
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="bookings" stroke="#5F6FFF" strokeWidth={4} fillOpacity={1} fill="url(#colorInd)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN --- */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-200 overflow-hidden relative">
             <div className="relative z-10">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><Zap size={18} className="text-yellow-400 fill-yellow-400"/> Quick Actions</h3>
                <div className="space-y-2 mt-4">
                    <SidebarButton icon={<Search size={16}/>} label="Search Bookings" />
                    <SidebarButton icon={<Calendar size={16}/>} label="View Schedule" />
                    <SidebarButton icon={<Settings size={16}/>} label="Terminal Settings" />
                </div>
             </div>
             <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2 mb-5">
                <Clock size={16} className="text-indigo-500"/> Latest Bookings
            </h3>
            <div className="space-y-4">
               {allBookings.slice(0, 5).map((booking, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {booking.user_id?.name?.charAt(0) || "G"}
                         </div>
                         <div>
                            <div className="text-xs font-bold text-slate-700">{booking.user_id?.name}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{booking.status}</div>
                         </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600">₱{booking.total_price || booking.amount}</span>
                  </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const StatCard = ({ label, value, icon, color, trend }) => {
  const styles = { indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", emerald: "bg-emerald-50 text-emerald-600 border-emerald-100" };
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
         <div className={`p-2.5 rounded-xl border ${styles[color]}`}>{icon}</div>
         <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-0.5">{trend} <ArrowUpRight size={10} /></span>
      </div>
      <div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
      </div>
    </div>
  );
};

const SidebarButton = ({ icon, label }) => (
    <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-left group">
        <span className="text-slate-400 group-hover:text-white transition-colors">{icon}</span>
        <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{label}</span>
    </button>
);

export default StaffDashboard;