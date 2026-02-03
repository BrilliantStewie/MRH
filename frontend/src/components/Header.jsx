import React from "react";
import { useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { ArrowUpRight, ShieldCheck, Star } from "lucide-react";

const Header = () => {
  const navigate = useNavigate();

  return (
    <section className="relative bg-[#F8F9FA] min-h-[90vh] flex items-center overflow-hidden py-20 px-6">
      
      {/* Background decoration (Abstract shape) */}
      <div className="absolute top-0 right-0 w-[60%] h-full bg-[#E9ECEF] skew-x-12 translate-x-32 z-0 hidden lg:block" />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        
        {/* LEFT: Typography & Content */}
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-6">
            <span className="h-px w-8 bg-blue-900"></span>
            <span className="text-blue-900 font-bold uppercase tracking-widest text-xs">
              Mercedarian Retreat House
            </span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-serif text-slate-900 leading-[1.1] mb-8">
            Elevate your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-900">
              inner peace.
            </span>
          </h1>

          <p className="text-slate-600 text-lg leading-relaxed mb-10 font-light">
            A sacred sanctuary in Bohol, dedicated to silence, prayer, and spiritual renewal.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button
              onClick={() => navigate("/rooms")}
              className="px-8 py-4 bg-slate-900 text-white font-medium hover:bg-blue-900 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
            >
              Browse Rooms
              <ArrowUpRight size={18} />
            </button>
            <button
              onClick={() => navigate("/about")}
              className="px-8 py-4 bg-white text-slate-900 border border-slate-200 font-medium hover:border-slate-400 transition-all flex items-center justify-center"
            >
              Learn More
            </button>
          </div>

          {/* Trust Footer */}
          <div className="flex items-center gap-8 pt-8 border-t border-slate-200">
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
        <div className="relative h-[600px] w-full hidden lg:block">
          
          {/* Main Large Image */}
          <div className="absolute top-0 right-0 w-[85%] h-[85%] rounded shadow-2xl overflow-hidden z-10">
             <img 
               src={assets.header_img} 
               alt="Main Sanctuary" 
               className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
             />
          </div>

          {/* Secondary Floating Image (Bottom Left overlap) */}
          <div className="absolute bottom-0 left-0 w-[55%] h-[50%] bg-white p-2 rounded shadow-2xl z-20">
             <div className="w-full h-full overflow-hidden bg-slate-100">
                {/* Assuming there might be another image, or reusing header_img with different crop */}
                <img 
                  src={assets.header_img} 
                  alt="Detail View" 
                  className="w-full h-full object-cover scale-150 translate-x-4" 
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
        <div className="lg:hidden w-full h-[400px] rounded-2xl overflow-hidden shadow-lg relative">
           <img src={assets.header_img} alt="Sanctuary" className="w-full h-full object-cover"/>
        </div>

      </div>
    </section>
  );
};

export default Header;