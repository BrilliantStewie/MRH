import React, { useContext, useEffect, useState } from 'react';
import { AdminContext } from '../../context/AdminContext';
import { 
  Search, Filter, CheckCircle, XCircle, 
  Clock, Banknote, CreditCard, Ban, FileX, Smartphone
} from 'lucide-react';

const AllBookings = () => {
  const { 
    aToken, 
    allBookings, 
    getAllBookings, 
    approveBooking, 
    declineBooking, 
    paymentConfirmed, 
    approveCancellation 
  } = useContext(AdminContext);
  
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filteredBookings, setFilteredBookings] = useState([]);

  useEffect(() => {
    if (aToken) getAllBookings();
  }, [aToken]);

  useEffect(() => {
    if (!Array.isArray(allBookings)) return;

    const result = allBookings.filter((item) => {
      const userName = item.user_id?.name || "";
      const roomName = item.room_ids?.[0]?.name || "";
      const bookingId = item._id || "";

      const matchesSearch =
        userName.toLowerCase().includes(search.toLowerCase()) ||
        roomName.toLowerCase().includes(search.toLowerCase()) ||
        bookingId.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filterStatus === "all" || item.status === filterStatus;

      return matchesSearch && matchesFilter;
    });

    setFilteredBookings(result.reverse());
  }, [search, filterStatus, allBookings]);

  const getStatusBadge = (status) => {
    const styles = {
      approved: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
      pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      cancelled: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
      cancellation_pending: "bg-purple-50 text-purple-700 ring-1 ring-purple-200 animate-pulse",
      declined: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    };
    const labels = {
      cancellation_pending: "Cancel Req.",
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || "bg-gray-100"}`}>
        {status === 'approved' && <CheckCircle size={10} />}
        {status === 'pending' && <Clock size={10} />}
        {status === 'cancelled' && <Ban size={10} />}
        {labels[status] || status.replace("_", " ")}
      </span>
    );
  };

  const getPaymentIcon = (method) => {
    if (method === 'gcash') return <span className="flex items-center gap-1 text-blue-600"><Smartphone size={12}/> GCash</span>;
    if (method === 'cash') return <span className="flex items-center gap-1 text-green-600"><Banknote size={12}/> Cash</span>;
    return <span className="flex items-center gap-1 text-slate-400"><CreditCard size={12}/> {method}</span>;
  };

  return (
    <div className='w-full p-6 bg-slate-50 min-h-screen'>
      
      {/* HEADER & FILTERS */}
      <div className='mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>All Bookings</h1>
          <p className='text-slate-500 text-sm'>Manage guest reservations and payments</p>
        </div>

        <div className='flex gap-3'>
          {/* Search */}
          <div className='relative group'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors' size={16} />
            <input 
              type="text" 
              placeholder="Search guest or room..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 transition-all shadow-sm'
            />
          </div>
          
          {/* Filter */}
          <div className='relative'>
             <div className='absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'>
                <Filter size={16} className="text-slate-400" />
             </div>
             <select 
               value={filterStatus} 
               onChange={(e) => setFilterStatus(e.target.value)}
               className='pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none shadow-sm cursor-pointer hover:bg-slate-50 transition-colors'
             >
               <option value="all">All Status</option>
               <option value="pending">Pending</option>
               <option value="approved">Approved</option>
               <option value="cancellation_pending">Cancel Request</option>
               <option value="cancelled">Cancelled</option>
               <option value="declined">Declined</option>
             </select>
          </div>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className='bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden'>
        <div className="overflow-x-auto">
          <table className='w-full text-left border-collapse'>
            <thead>
              <tr className='bg-slate-50/50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold tracking-wider'>
                <th className='px-6 py-4'>Guest Info</th>
                <th className='px-6 py-4'>Room Details</th>
                <th className='px-6 py-4'>Financials</th>
                <th className='px-6 py-4'>Status</th>
                <th className='px-6 py-4 text-center'>Actions</th>
              </tr>
            </thead>

            <tbody className='divide-y divide-slate-100'>
              {filteredBookings.length === 0 ? (
                 <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                        <FileX className="mx-auto mb-2 opacity-50" size={32}/>
                        <p>No bookings found matching your criteria.</p>
                    </td>
                 </tr>
              ) : (
                filteredBookings.map((item) => (
                  <tr key={item._id} className='hover:bg-slate-50/80 transition-colors group'>
                    
                    {/* GUEST */}
                    <td className='px-6 py-4'>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm ring-4 ring-white shadow-sm">
                          {item.user_id?.name ? item.user_id.name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div>
                           <p className='font-bold text-slate-800 text-sm'>{item.user_id?.name || "Unknown Guest"}</p>
                           <p className='text-xs text-slate-400 font-mono mt-0.5'>ID: {item._id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>

                    {/* ROOM */}
                    <td className='px-6 py-4'>
                       <p className='font-semibold text-slate-700 text-sm'>{item.room_ids?.[0]?.name || "Room Deleted"}</p>
                       <p className='text-xs text-slate-400 mt-1'>Check-in: {new Date(item.check_in || item.date).toLocaleDateString()}</p>
                    </td>

                    {/* AMOUNT */}
                    <td className='px-6 py-4'>
                      <div className='flex flex-col items-start gap-1'>
                        <span className='font-bold text-slate-900'>₱{item.total_price?.toLocaleString()}</span>
                        <div className='text-[10px] uppercase font-bold bg-slate-100 px-2 py-0.5 rounded-md'>
                          {getPaymentIcon(item.paymentMethod)}
                        </div>
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className='px-6 py-4'>
                      {getStatusBadge(item.status)}
                    </td>

                    {/* ACTIONS */}
                    <td className='px-6 py-4'>
                      <div className='flex items-center justify-center gap-2'>

                        {/* PENDING: Approve/Decline */}
                        {item.status === "pending" && (
                          <>
                            <button
                              onClick={() => approveBooking(item._id)}
                              className='bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors shadow-sm shadow-indigo-200'
                              title="Approve Booking"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => declineBooking(item._id)}
                              className='bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 p-2 rounded-lg transition-colors'
                              title="Decline Booking"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}

                        {/* APPROVED & UNPAID: Confirm Payment */}
                        {item.status === "approved" &&
                          item.paymentStatus === "pending" &&
                          item.payment === false && (
                            <button
                              onClick={() => paymentConfirmed(item._id)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all hover:scale-105 ${item.paymentMethod === 'cash' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                            >
                              <CheckCircle size={14} />
                              Confirm {item.paymentMethod === "cash" ? "Cash" : "GCash"}
                            </button>
                        )}

                        {/* CANCELLATION REQUEST */}
                        {item.status === "cancellation_pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveCancellation(item._id, "approve")}
                              className='px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-colors'
                            >
                              Accept Cancel
                            </button>
                            <button
                              onClick={() => approveCancellation(item._id, "reject")}
                              className='px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors'
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {/* PROCESSED STATE */}
                        {(item.payment || ["cancelled", "declined"].includes(item.status)) && (
                          <span className='text-xs font-medium text-slate-400 italic'>
                             No actions needed
                          </span>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AllBookings;