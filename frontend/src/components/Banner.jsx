import React, { useContext, useEffect, useState } from 'react';
import { assets } from '../assets/assets';
import { ArrowRight, Calendar } from 'lucide-react';
import AvailabilityCalendar from './AvailabilityCalendar';
import axios from "axios";
import { AppContext } from "../context/AppContext";
import {
  FRONTEND_REALTIME_EVENT_NAME,
  matchesRealtimeEntity,
} from "../utils/realtime";

const BANNER_AVAILABILITY_REFRESH_INTERVAL_MS = 15000;

const Banner = () => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { backendUrl } = useContext(AppContext);

  const [bookings, setBookings] = useState([]); 

  const fetchAvailability = async () => {
    if (!backendUrl) return;

    try {
      const { data } = await axios.get(`${backendUrl}/api/booking/calendar-availability`);
      if (data.success) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Failed to load availability:", error);
    }
  };

  useEffect(() => {
    if (!backendUrl) return undefined;

    fetchAvailability();

    const runVisibleRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchAvailability();
      }
    };

    const interval = setInterval(runVisibleRefresh, BANNER_AVAILABILITY_REFRESH_INTERVAL_MS);
    const handleFocus = () => fetchAvailability();
    const handleVisibilityChange = () => runVisibleRefresh();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [backendUrl]);

  useEffect(() => {
    if (!backendUrl) return undefined;

    const handleRealtimeUpdate = (event) => {
      if (matchesRealtimeEntity(event.detail, ["bookings"])) {
        fetchAvailability();
      }
    };

    window.addEventListener(FRONTEND_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    return () => {
      window.removeEventListener(FRONTEND_REALTIME_EVENT_NAME, handleRealtimeUpdate);
    };
  }, [backendUrl]);

  return (
    <div className="mx-auto mt-6 mb-12 max-w-7xl px-4 sm:mt-16 sm:mb-24 sm:px-6 lg:px-8">
      
      {/* Grid Container: 
        1 column sa mobile (stacked), 12 columns sa lg/desktop (side-by-side)
      */}
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-20">
        
        {/* 1. IMAGE CONTENT (Nasa TAAS sa mobile, nasa KANAN sa desktop) */}
        <div className="order-1 relative lg:order-2 lg:col-span-7">
           {/* Offset Shadow Box */}
           <div className="absolute -bottom-3 -right-3 z-0 h-full w-full rounded-2xl bg-slate-50 border border-slate-100 lg:-bottom-6 lg:-right-6 lg:rounded-[2rem]"></div>
           
           {/* Image Container */}
           <div className="relative z-10 w-full overflow-hidden rounded-2xl bg-slate-100 shadow-sm aspect-[4/3] lg:h-[450px] lg:rounded-[2rem] lg:aspect-auto">
              <img 
                 src={assets.appointment_img} 
                 alt="Mercedarian Hospitality Sister" 
                 className="h-full w-full object-cover object-top transition-transform duration-[2000ms] hover:scale-105"
              />
           </div>
        </div>

        {/* 2. TEXT CONTENT (Nasa BABA sa mobile, nasa KALIWA sa desktop) */}
        <div className="order-2 flex flex-col justify-center space-y-3 sm:space-y-4 lg:order-1 lg:col-span-5 lg:space-y-6">
           
           {/* Badge */}
           <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-px w-6 bg-slate-300 sm:w-8"></div>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:text-xs lg:tracking-[0.25em]">
                Mercedarian Hospitality
              </span>
           </div>

           {/* Typography - Binalik sa normal readable size dahil full width na sa mobile */}
           <div className="space-y-1 sm:space-y-2 lg:space-y-3">
             <h2 className="font-serif text-[2.65rem] leading-[0.98] text-[#0f172a] sm:text-5xl lg:text-6xl">
               Silence
             </h2>
             <h2 className="font-serif text-[2.65rem] leading-[0.98] text-slate-300 italic sm:text-5xl lg:text-6xl">
               is Sacred.
             </h2>
             
             <p className="pt-1.5 text-[0.95rem] font-light leading-relaxed text-slate-500 sm:pt-2 sm:text-base lg:max-w-[400px]">
               A physical response to the noise of the modern world. Choose from comfortable rooms designed for prayer, reflection, and the restoration of the soul.
             </p>
           </div>

           {/* Button */}
           <div className="pt-2 sm:pt-4">
             <button
               onClick={() => setIsCalendarOpen(true)}
               className="group inline-flex w-auto min-w-[190px] items-center justify-center gap-2 rounded-md bg-[#0f172a] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-md transition-all duration-300 hover:bg-slate-800 hover:shadow-lg sm:w-max sm:px-5 sm:py-3.5 sm:text-xs sm:tracking-widest lg:gap-3 lg:rounded-lg lg:px-7 lg:py-4"
             >
               <Calendar className="h-4 w-4" /> 
               Check Availability 
               <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
             </button>
           </div>
        </div>

      </div>

      {/* RENDER MODAL */}
      <AvailabilityCalendar 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
        bookings={bookings} 
      />
    </div>
  );
};

export default Banner;
