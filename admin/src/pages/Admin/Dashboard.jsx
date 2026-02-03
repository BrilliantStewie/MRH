import React, { useEffect, useContext, useState, useMemo } from "react";
import { AdminContext } from "../../context/AdminContext";
import axios from "axios";
import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  RefreshCw,
  Clock,
  Users,
  CalendarCheck,
  Banknote,
  Home as HomeIcon,
  Loader2,
  TrendingUp,
  Zap,
  CalendarDays,
} from "lucide-react";

const Dashboard = () => {
  const { aToken } = useContext(AdminContext);
  const backendUrl = "http://localhost:4000";

  const [stats, setStats] = useState({
    roomsCount: 0,
    bookingsCount: 0,
    guestsCount: 0,
    activeRooms: 0,
    totalRevenue: 0,
    latestBookings: [],
    revenueTrend: [],
    predictedRevenue: 0,
    busiestDay: "Monday",
  });

  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  /* =========================
     LIVE CLOCK
  ========================= */
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* =========================
     FETCH DASHBOARD DATA
  ========================= */
  const fetchStats = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/admin/dashboard`,
        {
          headers: { Authorization: `Bearer ${aToken}` },
        }
      );

      if (data.success) {
        const d = data.dashData || {};

        // ✅ FILTER VALID BOOKINGS
        const validBookings = (d.latestBookings || []).filter(
          (b) => !["cancelled", "declined"].includes(b.status)
        );

        const approvedBookings = validBookings.filter(
          (b) => b.status === "approved"
        );

        // ✅ CALCULATE REVENUE (PAID ONLY)
        const revenue = approvedBookings.reduce(
          (sum, b) =>
            b.paymentStatus === "paid"
              ? sum + b.total_price
              : sum,
          0
        );

        setStats({
          roomsCount: d.rooms || 0,
          bookingsCount: validBookings.length,
          guestsCount: approvedBookings.length,
          activeRooms: d.activeRooms || 0,
          totalRevenue: revenue,
          latestBookings: validBookings.slice(0, 5),
          revenueTrend: d.revenueTrend || [],
          predictedRevenue: d.predictedRevenue || 0,
          busiestDay: d.busiestDay || "Monday",
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aToken) {
      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [aToken]);

  /* =========================
     FORECAST DATA
  ========================= */
  const forecastData = useMemo(() => {
    const data = [...stats.revenueTrend];

    if (stats.predictedRevenue && data.length) {
      data.push({
        name: "Next Month",
        revenue: null,
        forecast: stats.predictedRevenue,
      });

      data[data.length - 2].forecast =
        data[data.length - 2].revenue;
    }

    return data;
  }, [stats.revenueTrend, stats.predictedRevenue]);

  /* =========================
     HELPERS
  ========================= */
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-900">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 text-sm">
            Real-time performance & analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2 text-slate-600 text-sm font-medium">
            <Clock className="w-4 h-4 text-blue-500" />
            {currentTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <button
            onClick={fetchStats}
            className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={Banknote}
          color="emerald"
          subtext="Paid bookings only"
        />
        <StatCard
          title="Active Guests"
          value={stats.guestsCount}
          icon={Users}
          color="blue"
          subtext="Approved bookings"
        />
        <StatCard
          title="Occupancy"
          value={`${stats.activeRooms} / ${stats.roomsCount}`}
          icon={HomeIcon}
          color="orange"
          subtext="Rooms occupied today"
        />
        <StatCard
          title="Total Bookings"
          value={stats.bookingsCount}
          icon={CalendarCheck}
          color="purple"
          subtext="Valid bookings"
        />
      </div>

      {/* ANALYTICS */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Revenue Forecast
        </h2>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(val) =>
                    val ? `₱${(val / 1000).toFixed(0)}k` : ""
                  }
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.15}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#a855f7"
                  strokeDasharray="5 5"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RECENT BOOKINGS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">
            Recent Bookings
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400">
              <tr>
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Rooms</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.latestBookings.map((b) => (
                <tr key={b._id}>
                  <td className="px-6 py-4 font-medium">
                    {b.user_id?.name || "Guest"}
                  </td>
                  <td className="px-6 py-4">
                    {b.room_ids?.map((r) => r.name).join(", ")}
                  </td>
                  <td className="px-6 py-4">
                    {formatDate(b.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    {formatCurrency(b.total_price)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs border ${getStatusColor(
                        b.status
                      )}`}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!stats.latestBookings.length && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-6 text-center text-slate-400"
                  >
                    No bookings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* =========================
   STAT CARD
========================= */
const StatCard = ({ title, value, icon: Icon, color, subtext }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500 mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-extrabold text-slate-800">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-xs text-slate-400 font-medium">{subtext}</p>
    </div>
  );
};

export default Dashboard;
