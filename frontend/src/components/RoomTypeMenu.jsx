import React, { useState, useEffect } from "react";
import { roomTypeData } from "../assets/assets";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Users, Maximize, Wifi, PauseCircle, PlayCircle } from "lucide-react";

const RoomTypeMenu = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance slider every 3 SECONDS
  useEffect(() => {
    let interval;
    if (!isPaused) {
      interval = setInterval(() => {
        handleNext();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [currentIndex, isPaused]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % roomTypeData.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + roomTypeData.length) % roomTypeData.length);
  };

  const currentRoom = roomTypeData[currentIndex];

  return (
    <section 
      className="relative h-screen w-full bg-slate-900 overflow-hidden text-white group/slider" 
      id="room-type"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      
      {/* --- NAVIGATION ARROWS (End to End) --- */}
      <button 
        onClick={handlePrev}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 w-14 h-14 rounded-full border border-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all duration-300 group hover:-translate-x-2"
      >
        <ChevronLeft size={28} />
      </button>

      <button 
        onClick={handleNext}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 w-14 h-14 rounded-full border border-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all duration-300 group hover:translate-x-2"
      >
        <ChevronRight size={28} />
      </button>


      {/* --- BACKGROUND SLIDESHOW LAYER --- */}
      {roomTypeData.map((room, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
           {/* Ken Burns Effect */}
           <img
            src={room.image}
            alt={room.roomtype}
            className={`w-full h-full object-cover transition-transform duration-[10s] ease-linear ${
                index === currentIndex && !isPaused ? "scale-110" : "scale-100"
            }`}
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/20 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
        </div>
      ))}


      {/* --- CONTENT LAYER --- */}
      <div className="absolute inset-0 z-20 flex items-center pointer-events-none">
        <div className="max-w-7xl mx-auto px-16 md:px-24 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 pointer-events-auto items-end pb-24 lg:pb-0">
            
            {/* LEFT: TEXT INFO */}
            <div className="lg:col-span-7 space-y-8 lg:mb-12">
                <div key={currentIndex} className="animate-in fade-in slide-in-from-left-8 duration-700">
                    
                    {/* Counter Label */}
                    <div className="flex items-center gap-3 mb-6">
                        <span className="h-px w-12 bg-blue-400"></span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">
                            Room {currentIndex + 1} of {roomTypeData.length}
                        </span>
                    </div>

                    {/* TITLE - Added whitespace-nowrap to keep it on one line */}
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-serif mb-6 leading-tight text-white drop-shadow-xl whitespace-nowrap">
                        {currentRoom.roomtype}
                    </h2>

                    <p className="text-slate-200 text-lg font-light leading-relaxed mb-8 max-w-xl drop-shadow-md border-l-2 border-blue-500/50 pl-6">
                        A sanctuary designed for silence. Experience deep rest with natural lighting, premium linens, and a private prayer corner.
                    </p>

                    {/* Features */}
                    <div className="flex gap-8 mb-10 text-sm">
                        <div className="flex items-center gap-2 text-slate-100">
                            <Users size={18} className="text-blue-400"/> <span>2-4 Guests</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-100">
                            <Maximize size={18} className="text-blue-400"/> <span>35m²</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-100">
                            <Wifi size={18} className="text-blue-400"/> <span>Fast Wifi</span>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <div className="flex items-center gap-6">
                        <Link 
                            to={`/rooms/${currentRoom.roomtype}`}
                            className="bg-white text-slate-900 px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-blue-50 hover:scale-105 transition-all shadow-xl shadow-black/20 flex items-center gap-2"
                        >
                            View Details <ArrowRight size={14} />
                        </Link>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Starting at</span>
                            <span className="text-2xl font-serif text-white">₱1,500</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: THUMBNAIL NAVIGATOR */}
            <div className="hidden lg:flex lg:col-span-5 flex-col items-end gap-4 mb-12">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                   {isPaused ? <PauseCircle size={14} /> : <PlayCircle size={14} />} 
                   Next Up
                </span>
                
                <div className="flex gap-4">
                  {roomTypeData.map((room, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`relative w-24 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                        index === currentIndex 
                          ? "border-blue-400 scale-110 shadow-lg shadow-blue-900/50" 
                          : "border-transparent opacity-50 hover:opacity-100 grayscale hover:grayscale-0"
                      }`}
                    >
                      <img src={room.image} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
            </div>

        </div>
      </div>

      

    </section>
  );
};

export default RoomTypeMenu;