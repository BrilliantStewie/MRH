import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { ArrowRight, ChevronLeft, ChevronRight, Users, Maximize, Wifi, PauseCircle, PlayCircle } from "lucide-react";

// The filterValue exactly matches what Rooms.jsx expects
// The filterValue exactly matches what Rooms.jsx expects
const roomTypes = [
  {
    roomtype: "Individual",
    filterValue: "Individual", 
    image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=1000&auto=format&fit=crop", 
    description: "A private sanctuary designed for silence and deep rest. Experience solitude with natural lighting and premium linens.",
    capacity: "1 Guest",
    size: "20m²",
    price: "₱1,000"
  },
  {
    roomtype: "Individual with Pullout",
    filterValue: "Individual with pullout",
    // 👇 ANOTHER NEW WORKING IMAGE LINK HERE
    image: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1000&auto=format&fit=crop",
    description: "Flexible accommodation featuring a main bed and an additional pullout bed. Perfect for close companions or small families.",
    capacity: "2 Guests",
    size: "25m²",
    price: "₱1,500"
  },
  {
    roomtype: "Dormitory",
    filterValue: "Dormitory",
    image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1000&auto=format&fit=crop",
    description: "Spacious shared quarters ideal for retreats, youth camps, and large groups. Fosters community and togetherness.",
    capacity: "4-10 Guests",
    size: "50m²",
    price: "₱800"
  }
];

const RoomTypeMenu = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate(); 

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
    setCurrentIndex((prev) => (prev + 1) % roomTypes.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + roomTypes.length) % roomTypes.length);
  };

  const currentRoom = roomTypes[currentIndex];

  return (
    <section 
      className="relative h-screen w-full bg-slate-900 overflow-hidden text-white group/slider" 
      id="room-type"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      
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

      {roomTypes.map((room, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
           <img
            src={room.image}
            alt={room.roomtype}
            className={`w-full h-full object-cover transition-transform duration-[10s] ease-linear ${
                index === currentIndex && !isPaused ? "scale-110" : "scale-100"
            }`}
          />
          <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/20 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
        </div>
      ))}

      <div className="absolute inset-0 z-20 flex items-center pointer-events-none">
        <div className="max-w-7xl mx-auto px-16 md:px-24 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 pointer-events-auto items-end pb-24 lg:pb-0">
            
            <div className="lg:col-span-7 space-y-8 lg:mb-12">
                <div key={currentIndex} className="animate-in fade-in slide-in-from-left-8 duration-700">
                    
                    <div className="flex items-center gap-3 mb-6">
                        <span className="h-px w-12 bg-blue-400"></span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">
                            Room {currentIndex + 1} of {roomTypes.length}
                        </span>
                    </div>

                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-serif mb-6 leading-tight text-white drop-shadow-xl whitespace-nowrap">
                        {currentRoom.roomtype}
                    </h2>

                    <p className="text-slate-200 text-lg font-light leading-relaxed mb-8 max-w-xl drop-shadow-md border-l-2 border-blue-500/50 pl-6">
                        {currentRoom.description}
                    </p>

                    <div className="flex gap-8 mb-10 text-sm">
                        <div className="flex items-center gap-2 text-slate-100">
                            <Users size={18} className="text-blue-400"/> <span>{currentRoom.capacity}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-100">
                            <Maximize size={18} className="text-blue-400"/> <span>{currentRoom.size}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-100">
                            <Wifi size={18} className="text-blue-400"/> <span>Fast Wifi</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => navigate("/rooms", { state: { selectedRoomType: currentRoom.filterValue } })}
                            className="bg-white text-slate-900 px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-blue-50 hover:scale-105 transition-all shadow-xl shadow-black/20 flex items-center gap-2 cursor-pointer z-50"
                        >
                            View Details <ArrowRight size={14} />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Starting at</span>
                            <span className="text-2xl font-serif text-white">{currentRoom.price}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hidden lg:flex lg:col-span-5 flex-col items-end gap-4 mb-12">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                   {isPaused ? <PauseCircle size={14} /> : <PlayCircle size={14} />} 
                   Next Up
                </span>
                
                <div className="flex gap-4">
                  {roomTypes.map((room, index) => (
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