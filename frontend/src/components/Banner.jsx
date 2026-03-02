import React, { useState } from 'react'; // Added useState
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Star, Calendar } from 'lucide-react';
import AvailabilityCalendar from './AvailabilityCalendar'; // Import your calendar component

const Banner = () => {
  const navigate = useNavigate();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // You would typically fetch these from your API or pass them as props
  const [bookings, setBookings] = useState([]); 

  return (
    <div className="max-w-7xl mx-auto px-8 mt-16 mb-24">
      
      {/* Main Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        
        {/* 1. TEXT CONTENT (5 Columns) */}
        <div className="lg:col-span-5 order-2 lg:order-1 flex flex-col justify-center space-y-8">
           
           {/* Badge */}
           <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-slate-200"></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                Mercedarian Hospitality
              </span>
           </div>

           <div className="space-y-4">
             <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-slate-900 leading-[1.1]">
               Silence <br />
               <span className="text-slate-300 italic">is Sacred.</span>
             </h2>
             <p className="text-slate-500 text-sm md:text-base leading-relaxed font-light max-w-md">
               A physical response to the noise of the modern world. Choose from comfortable rooms designed for prayer, reflection, and the restoration of the soul.
             </p>
           </div>

           <div className="pt-2 flex flex-col sm:flex-row gap-4">
              {/* Updated Button to open Calendar instead of direct navigation */}
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="group inline-flex items-center justify-center gap-3 bg-[#0f172a] text-white px-8 py-4 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all duration-300 shadow-xl shadow-slate-200"
              >
                <Calendar size={14} /> Check Availability <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
           </div>
        </div>

        {/* 2. IMAGE CONTENT (7 Columns) */}
        <div className="lg:col-span-7 order-1 lg:order-2 relative">
           <div className="relative rounded-[2rem] overflow-hidden shadow-2xl bg-slate-100 aspect-[4/3] lg:aspect-auto lg:h-[500px] group">
              <img 
                  src={assets.appointment_img} 
                  alt="Sanctuary Interiors" 
                  className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
           </div>
           <div className="absolute -z-10 top-12 -right-12 w-full h-full border border-slate-100 rounded-[2.5rem] hidden lg:block"></div>
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