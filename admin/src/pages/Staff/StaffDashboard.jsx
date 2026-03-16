import React, { useContext, useEffect, useMemo, useState } from "react";
import { StaffContext } from "../../context/StaffContext";
import axios from "axios";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  Bell,
  Calendar,
  Clock,
  Search,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "react-toastify";

const normalizeDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const StaffDashboard = () => {
  const { backendUrl, sToken } = useContext(StaffContext);
  
  const [allBookings, setAllBookings] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

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

  // --- SYNCED DATA LOGIC (Matching Admin Dashboard) ---
  const stats = useMemo(() => {
    const bookings = allBookings || [];
    const rooms = allRooms || [];

    const today = normalizeDate(new Date());
    const occupiedRoomIds = new Set();

    bookings.forEach((booking) => {
      if ((booking.status || "").toLowerCase() !== "approved") return;

      const checkIn = normalizeDate(booking.check_in || booking.checkIn || booking.date);
      const checkOut = normalizeDate(booking.check_out || booking.checkOut);
      if (!today || !checkIn || !checkOut) return;

      if (today >= checkIn && today < checkOut) {
        (booking.bookingItems || []).forEach((item) => {
          const roomId = item?.room_id?._id ?? item?.room_id;
          if (roomId) occupiedRoomIds.add(String(roomId));
        });
      }
    });

    const occupiedCount = occupiedRoomIds.size;
    const totalRooms = rooms.length || 0;
    const occupancyRate = totalRooms ? Math.round((occupiedCount / totalRooms) * 100) : 0;

    const pendingBookings = bookings.filter((booking) => booking.status === "pending").length;
    const pendingCancellations = bookings.filter(
      (booking) => booking.status === "cancellation_pending"
    ).length;

    return {
      totalBookings: bookings.length,
      totalUsers: (allUsers || []).length,
      occupancy: occupiedCount,
      totalRooms: rooms.length,
      occupancyRate,
      pendingRequests: pendingBookings + pendingCancellations,
    };
  }, [allRooms, allBookings, allUsers]);

  const chartData = useMemo(() => {
    const months = [];
    const currentDate = new Date();
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 5; i >= 0; i -= 1) {
      const targetMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        label: monthLabels[targetMonth.getMonth()],
        month: targetMonth.getMonth(),
        year: targetMonth.getFullYear(),
        bookings: 0,
      });
    }

    (allBookings || []).forEach((booking) => {
      const bookingDate = new Date(booking.check_in || booking.date || booking.createdAt);
      const monthBucket = months.find(
        (month) => month.month === bookingDate.getMonth() && month.year === bookingDate.getFullYear()
      );

      if (monthBucket) {
        monthBucket.bookings += 1;
      }
    });

    const maxBookings = Math.max(...months.map((month) => month.bookings), 1);
    return months.map((month) => ({
      ...month,
      height: Math.round((month.bookings / maxBookings) * 100),
    }));
  }, [allBookings]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-800 md:p-8">
      <header className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Good day, Staff</h1>
          <p className="mt-1 font-medium text-slate-500">Property Overview & Real-time Analytics</p>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Bookings"
          value={stats.totalBookings}
          icon={<BarChart3 size={20} />}
          color="slate"
          subValue="All time"
        />
        <StatCard
          label="Total Guests"
          value={stats.totalUsers}
          icon={<Users size={20} />}
          color="emerald"
          subValue="Directory count"
        />
        <StatCard
          label="Actions Required"
          value={stats.pendingRequests}
          icon={<AlertCircle size={20} />}
          color="rose"
          subValue="Pending approvals"
        />

        <div className="flex h-36 flex-col justify-between rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="rounded-[14px] border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-600">
              <BedDouble size={20} />
            </div>
            <span className="text-2xl font-black text-slate-900">{stats.occupancyRate}%</span>
          </div>
          <div className="mt-2">
            <div className="mb-2 flex items-end justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Live Occupancy
              </p>
              <p className="text-[10px] font-bold text-slate-500">
                {stats.occupancy}/{stats.totalRooms} Units
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-1000"
                style={{ width: `${stats.occupancyRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex h-full min-h-[320px] flex-col justify-between rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-800">
                  <BarChart3 size={18} className="text-emerald-500" /> Booking Overview
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Confirmed bookings over the last 6 months
                </p>
              </div>
            </div>

            <div className="relative mt-auto flex h-56 items-end justify-between gap-2 pt-4 sm:gap-4">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="h-0 w-full border-t border-dashed border-slate-100"></div>
                ))}
              </div>

              {chartData.map((data, index) => (
                <div
                  key={`${data.year}-${data.month}-${index}`}
                  className="group z-10 flex h-full flex-1 cursor-pointer flex-col items-center justify-end"
                >
                  <div className="mb-2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    {data.bookings} bookings
                  </div>
                  <div
                    className="relative w-full max-w-[48px] overflow-hidden rounded-t-xl bg-indigo-50 transition-all duration-500 group-hover:bg-indigo-500"
                    style={{ height: `${Math.max(data.height, 8)}%` }}
                  >
                    <div className="absolute bottom-0 h-1/2 w-full bg-gradient-to-t from-indigo-200 to-transparent group-hover:from-indigo-600"></div>
                  </div>
                  <span className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-indigo-600">
                    {data.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex lg:col-span-5">
          <div className="group relative flex min-h-[320px] w-full flex-col justify-between overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm transition-colors duration-300 hover:border-indigo-200">
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-indigo-50/80 blur-3xl transition-transform duration-700 group-hover:scale-110"></div>
            <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/3 rounded-full bg-emerald-50/60 blur-3xl"></div>

            <div className="relative z-10 mb-6 flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 shadow-sm">
                <Zap size={28} className="text-indigo-600" />
              </div>
              <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500 shadow-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                Operations
              </span>
            </div>

            <div className="relative z-10 mt-auto">
              <h3 className="mb-2 text-3xl font-black tracking-tight text-slate-900">Express Access</h3>
              <p className="mb-8 max-w-[90%] text-sm font-medium leading-relaxed text-slate-500">
                Quick shortcuts to common staff tools and daily activity lookup.
              </p>

              <div className="flex flex-col gap-3">
                <SidebarButton icon={<Search size={18} />} label="Search Records" />
                <SidebarButton icon={<Calendar size={18} />} label="Duty Schedule" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h2 className="font-black text-slate-800 text-lg flex items-center gap-2 uppercase tracking-tight">
            <Clock size={18} className="text-indigo-500"/> Recent Logs
          </h2>
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
              {allBookings?.slice(0, 5).map((booking, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center font-black text-slate-400">
                         {booking.user_id?.image ? (
                            <img src={booking.user_id.image.startsWith('http') ? booking.user_id.image : `${backendUrl}/${booking.user_id.image}`} className="w-full h-full object-cover" alt="user" />
                         ) : (
                            <span>{booking.user_id?.firstName?.[0] || "G"}</span>
                         )}
                      </div>
                      <div>
                        <p className="font-black text-slate-700 text-sm">
                          {booking.user_id?.firstName} {booking.user_id?.lastName}
                        </p>
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
  );
};

// --- HELPER COMPONENTS ---

const StatCard = ({ label, value, icon, color, subValue }) => {
  const themes = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  const activeTheme = themes[color] || themes.indigo;

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between h-40">
      <div className="flex justify-between items-start">
         <div className={`p-3 rounded-2xl border ${activeTheme}`}>{icon}</div>
      </div>
      <div>
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
        <p className="text-[10px] text-slate-400 font-bold mt-1">{subValue}</p>
      </div>
    </div>
  );
};

const SidebarButton = ({ icon, label }) => (
    <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group">
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

export default StaffDashboard;
