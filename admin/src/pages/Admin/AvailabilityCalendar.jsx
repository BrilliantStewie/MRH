import React, { useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  getBookingCheckInDateValue,
  getBookingCheckOutDateValue,
} from "../../utils/bookingDateFields";
import { formatMonthYearPHT } from "../../utils/dateTime";

const AvailabilityCalendar = ({ isOpen, onClose, bookings }) => {
  const [viewDate, setViewDate] = useState(new Date());

  const unavailableDates = useMemo(() => {
    if (!bookings) return [];
    const dates = [];
    bookings.forEach(b => {
      const status = String(b.status || b.paymentStatus || "")
        .replace(/[_-\s]/g, "")
        .toLowerCase();
      if (['approved', 'paid', 'checkedin', 'pending'].includes(status)) {
        const start = new Date(getBookingCheckInDateValue(b));
        const end = new Date(getBookingCheckOutDateValue(b));
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        let current = new Date(start);
        while (current <= end) {
          dates.push(new Date(current).getTime());
          current.setDate(current.getDate() + 1);
        }
      }
    });
    return [...new Set(dates)].map(time => new Date(time));
  }, [bookings]);

  const getDayClass = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isCurrentMonth = date.getMonth() === viewDate.getMonth();
    const isPast = date < today;

    if (!isCurrentMonth || isPast) return "pro-day-locked";
    
    const time = date.getTime();
    const isUnavailable = unavailableDates.some(d => d.getTime() === time);
    return isUnavailable ? "pro-day-amber" : "pro-day-open";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      
      <style>{`
        .pro-calendar-v4 .react-datepicker {
          border: none;
          font-family: inherit;
          background: transparent;
        }
        .pro-calendar-v4 .react-datepicker__header {
          background: transparent;
          border: none;
          padding: 0;
        }
        .pro-calendar-v4 .react-datepicker__day-name {
          color: #94a3b8;
          font-weight: 700;
          font-size: 0.75rem;
          width: 3.4rem;
          margin: 0.25rem;
          text-transform: uppercase;
        }
        .pro-calendar-v4 .react-datepicker__day {
          width: 3.4rem;
          height: 3.4rem;
          line-height: 3.4rem;
          border-radius: 9999px !important;
          margin: 0.25rem;
          font-weight: 500;
          font-size: 0.95rem;
          border: 1px solid transparent;
          pointer-events: none; 
          cursor: default !important;
        }

        /* OPEN - AVAILABLE */
        .pro-calendar-v4 .pro-day-open {
          background: #ffffff !important;
          color: #334155 !important;
          border: 1px solid #e2e8f0 !important;
        }

        /* AMBER - RESERVED */
        .pro-calendar-v4 .pro-day-amber {
          background-color: #fffbeb !important;
          color: #92400e !important;
          border: 1px solid #fde68a !important;
        }

        /* TODAY INDICATOR - BLACK BACKGROUND, WHITE FONT */
        .pro-calendar-v4 .react-datepicker__day--today {
          background-color: #0f172a !important; /* Solid black/slate */
          color: #ffffff !important;           /* White text */
          font-weight: 800 !important;
          border: none !important;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }

        .pro-calendar-v4 .pro-day-locked {
          opacity: 0.15;
        }
        
        .pro-calendar-v4 .react-datepicker__day--selected {
          background: none !important;
          color: inherit !important;
        }
      `}</style>

      <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col border border-slate-200">
        
        <div className="relative px-10 py-7 border-b border-slate-50 flex justify-between items-center bg-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-8 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close availability calendar"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-slate-50 rounded-full flex items-center justify-center text-slate-900 border border-slate-100">
              <Calendar size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Check Availability</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-0.5">Live Schedule</p>
            </div>
          </div>
        </div>

        <div className="p-8 pro-calendar-v4 flex flex-col items-center">
          <DatePicker
            inline
            readOnly
            onMonthChange={(date) => setViewDate(date)}
            dayClassName={getDayClass}
            renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
              <div className="w-full flex items-center justify-between px-4 mb-8">
                <span className="text-xl font-extrabold text-slate-800">
                  {formatMonthYearPHT(date)}
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={decreaseMonth} 
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 hover:border-slate-900 transition-all pointer-events-auto"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={increaseMonth} 
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 hover:border-slate-900 transition-all pointer-events-auto"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          />
        </div>

        <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Reserved</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;


