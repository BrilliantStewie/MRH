import React, { useState } from 'react';
import { 
  X, ChevronLeft, ChevronRight, 
  Calendar as CalIcon, Building2, User 
} from 'lucide-react';

const AvailabilityCalendar = ({ isOpen, onClose, bookings }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  if (!isOpen) return null;

  // --- LOGIC (Kept identical for accuracy) ---
  const getDateString = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d)) return "";
    return d.toLocaleDateString('en-CA'); 
  };

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getBookingsForDay = (dayNumber) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
    const targetString = getDateString(targetDate);

    return bookings.filter(b => {
      const isValidStatus = ['confirmed', 'checked_in', 'paid'].includes((b.status || "").toLowerCase()) || b.payment === true;
      if (!isValidStatus) return false;
      const bookingString = getDateString(b.date || b.checkInDate || b.createdAt); 
      return bookingString === targetString;
    });
  };

  // --- RENDER ---
  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 transition-all duration-300">
      
      {/* 1. Glass Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* 2. Main Modal Container */}
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <CalIcon size={22} />
              </span>
              Availability
            </h2>
            <p className="text-sm text-slate-500 font-medium ml-1 mt-1">
              Manage property schedule and organizations.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Navigation Pill */}
            <div className="flex items-center bg-slate-50 rounded-full p-1 border border-slate-200">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-full text-slate-500 hover:text-indigo-600 transition-all">
                <ChevronLeft size={18} />
              </button>
              <span className="px-4 font-bold text-slate-700 text-sm min-w-[140px] text-center">
                {monthName}
              </span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-full text-slate-500 hover:text-indigo-600 transition-all">
                <ChevronRight size={18} />
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CALENDAR BODY */}
        <div className="p-8 overflow-y-auto bg-slate-50/50">
          
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-3 auto-rows-fr">
            {blanks.map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[120px]"></div>
            ))}
            
            {days.map(day => {
              const dayBookings = getBookingsForDay(day);
              const isBooked = dayBookings.length > 0;
              const isToday = 
                new Date().getDate() === day && 
                new Date().getMonth() === currentDate.getMonth() &&
                new Date().getFullYear() === currentDate.getFullYear();

              return (
                <div 
                  key={day} 
                  className={`
                    group min-h-[120px] rounded-2xl p-3 flex flex-col relative transition-all duration-200 border
                    ${isToday 
                      ? 'bg-white border-indigo-200 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-100 z-10' 
                      : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-md'
                    }
                  `}
                >
                  {/* Date Number */}
                  <div className="flex justify-between items-start mb-2">
                    <span 
                      className={`
                        text-sm font-bold flex items-center justify-center w-7 h-7 rounded-full
                        ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-400 group-hover:text-indigo-600'}
                      `}
                    >
                      {day}
                    </span>
                    {/* Tiny visual indicator for availability */}
                    {!isBooked && (
                         <div className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full transition-opacity">
                            Open
                         </div>
                    )}
                  </div>

                  {/* Booking Slots */}
                  <div className="flex-1 flex flex-col gap-1.5">
                    {isBooked ? (
                      dayBookings.map((b, idx) => (
                        <div 
                            key={idx} 
                            className="bg-slate-50 border-l-4 border-indigo-500 pl-2 pr-2 py-1.5 rounded-r-lg shadow-sm hover:bg-white hover:shadow-md transition-all cursor-default"
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                             <User size={10} className="text-slate-400" />
                             <p className="text-[11px] font-bold text-slate-800 truncate">
                                {b.user_id?.name || "Guest"}
                             </p>
                          </div>
                          
                          {/* Organization Highlight */}
                          <div className="flex items-center gap-1.5">
                             <Building2 size={10} className="text-indigo-400" />
                             <p className="text-[10px] font-semibold text-indigo-600 truncate">
                                {b.user_id?.org || b.org || "Individual"}
                             </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Empty state pattern
                      <div className="h-full rounded-lg bg-slate-50/50 border border-dashed border-slate-100 hidden group-hover:block transition-all"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER LEGEND */}
        <div className="bg-white border-t border-slate-100 p-4 flex justify-between items-center text-xs text-slate-500">
           <div className="flex gap-6">
              <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Booked (Confirmed)
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-200"></div> Available
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div> Selected Today
              </div>
           </div>
           <div>
              Showing {bookings.length} total active bookings
           </div>
        </div>

      </div>
    </div>
  );
};

export default AvailabilityCalendar;