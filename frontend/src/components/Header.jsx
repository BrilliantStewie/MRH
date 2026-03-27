import React from "react";
import { useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { ArrowUpRight, ShieldCheck, Star } from "lucide-react";

const Header = () => {
  const navigate = useNavigate();

  return (
    <section className="relative flex items-center overflow-hidden bg-[#F8F9FA] px-4 py-12 sm:px-6 sm:py-16 lg:min-h-[90vh] lg:py-20">
      
      {/* Background decoration (Abstract shape) */}
      <div className="absolute top-0 right-0 w-[60%] h-full bg-[#E9ECEF] skew-x-12 translate-x-32 z-0 hidden lg:block" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
        
        {/* LEFT: Typography & Content */}
        <div className="max-w-2xl lg:max-w-xl">
          <div className="mb-4 flex items-center gap-2 sm:mb-6">
            <span className="h-px w-8 bg-blue-900"></span>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-blue-900 sm:tracking-widest">
              Mercedarian Retreat House
            </span>
          </div>

          <h1 className="mb-6 font-serif text-[2.75rem] leading-[1.05] text-slate-900 sm:mb-8 sm:text-5xl lg:text-7xl">
            Elevate your <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-900">
              inner peace.
            </span>
          </h1>

          <p className="mb-8 text-base font-light leading-relaxed text-slate-600 sm:mb-10 sm:text-lg">
            A sacred sanctuary in Bohol, dedicated to silence, prayer, and spiritual renewal.
          </p>

          <div className="mb-10 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:gap-4">
            <button
              onClick={() => navigate("/rooms")}
              className="flex w-full items-center justify-center gap-3 bg-slate-900 px-6 py-3.5 font-medium text-white shadow-xl shadow-slate-200 transition-all hover:bg-blue-900 sm:w-auto sm:px-8 sm:py-4"
            >
              Browse Rooms
              <ArrowUpRight size={18} />
            </button>
            <button
              onClick={() => navigate("/about")}
              className="flex w-full items-center justify-center border border-slate-200 bg-white px-6 py-3.5 font-medium text-slate-900 transition-all hover:border-slate-400 sm:w-auto sm:px-8 sm:py-4"
            >
              Learn More
            </button>
          </div>

          {/* Trust Footer */}
          <div className="flex flex-col items-start gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:gap-8 sm:pt-8">
             <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-blue-700" />
                <span className="text-sm font-semibold text-slate-700">Secure Premises</span>
             </div>
             <div className="flex items-center gap-2">
                <Star size={20} className="text-blue-700" />
                <span className="text-sm font-semibold text-slate-700">Top Rated Service</span>
             </div>
          </div>
        </div>

        {/* RIGHT: Layered Image Composition */}
        <div className="relative hidden h-[clamp(420px,58vw,600px)] w-full lg:block">
          
          {/* Main Large Image */}
          <div className="absolute top-0 right-0 h-[85%] w-[85%] overflow-hidden rounded-[28px] shadow-2xl z-10">
             <img 
               src={assets.header_img} 
               alt="Main Sanctuary" 
               className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
             />
          </div>

          {/* Secondary Floating Image (Bottom Left overlap) */}
          <div className="absolute bottom-0 left-0 h-[50%] w-[55%] rounded-[24px] bg-white p-2 shadow-2xl z-20">
             <div className="w-full h-full overflow-hidden bg-slate-100">
                {/* Assuming there might be another image, or reusing header_img with different crop */}
                <img 
                  src={assets.header_img} 
                  alt="Detail View" 
                  className="h-full w-full object-cover object-center scale-150 translate-x-4" 
                />
             </div>
          </div>

          {/* Floating Badge (Top Right overlap) */}
          <div className="absolute top-10 -left-10 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-lg z-30 max-w-[200px]">
             <p className="text-4xl font-serif text-blue-900 font-bold mb-1">20+</p>
             <p className="text-xs text-slate-500 font-medium leading-tight">
               Years of serving the community with silence and prayer.
             </p>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl -z-10"></div>

        </div>

        {/* Mobile Image Fallback */}
        <div className="w-full max-h-[26rem] overflow-hidden rounded-[24px] shadow-lg sm:rounded-2xl lg:hidden">
           <img src={assets.header_img} alt="Sanctuary" className="aspect-[4/3] w-full object-cover object-center sm:aspect-[16/10]"/>
        </div>

      </div>
    </section>
  );
};

export default Header;
