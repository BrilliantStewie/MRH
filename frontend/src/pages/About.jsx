import React from 'react';
// Direct import to ensure the build tool (Vite/Webpack) finds the file
import mrh_about from '../assets/mrh_about.jpg'; 
import { Ship, Sun, Feather, Cross } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 pt-10">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* --- HEADER SECTION --- */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Mercedarian <span className="text-blue-600">Retreat House</span>
          </h1>
          <div className="w-28 h-1.5 bg-blue-600 mx-auto rounded-full mb-6"></div>
        </div>
        
        {/* --- SECTION 1: THE SPLIT HERO --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-32 items-stretch">
          
          {/* Left Block: Image Container */}
          <div className="relative h-[500px] lg:h-auto rounded-[2.5rem] overflow-hidden shadow-2xl group bg-slate-200">
            <img 
              src={mrh_about} 
              alt="Mercedarian Retreat House and Sisters" 
              className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110" 
              onError={(e) => {
                console.error("Image failed to load at path:", mrh_about);
                e.target.src = "https://via.placeholder.com/800x1200?text=Check+File+Extension";
              }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
            <div className="absolute bottom-10 left-10 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-80 mb-2">Since 2004</p>
                <h2 className="text-3xl font-serif italic">A sanctuary for the spirit.</h2>
            </div>
          </div>

          {/* Right Block: Content Card */}
          <div className="bg-white rounded-[2.5rem] p-10 md:p-16 flex flex-col justify-center border border-slate-100 shadow-sm">
            <div className="inline-flex items-center gap-2 mb-8 text-blue-600">
                <Cross size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Our Sacred Story</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-serif text-slate-900 leading-tight mb-8">
                Elevating your <br /> 
                <span className="text-blue-600">inner peace</span> through silence.
            </h1>

            <div className="space-y-6 text-slate-500 font-light leading-relaxed">
              <p>
                The <strong className="text-slate-900 font-medium">Mercedarian Retreat House</strong> was established as a physical response to the noise of the modern world. We offer more than rooms; we offer a distinct architectural experience designed for prayer.
              </p>
              <p>
                Our mission is to provide professional hospitality within a strictly quiet environment, allowing every guest to encounter the Divine in the beauty of Bohol's landscape.
              </p>
            </div>
          </div>
        </div>

        {/* --- SECTION 2: THE ATMOSPHERE --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="p-10 bg-white rounded-[2rem] border border-slate-100 hover:shadow-xl transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all mb-6">
                <Sun size={24} strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-4">Clarity</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
                Spaces filled with natural light to illuminate your path toward spiritual renewal.
            </p>
          </div>

          <div className="p-10 bg-white rounded-[2rem] border border-slate-100 hover:shadow-xl transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all mb-6">
                <Feather size={24} strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-4">Softness</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
                An environment designed for quiet movements and gentle reflection.
            </p>
          </div>

          <div className="p-10 bg-white rounded-[2rem] border border-slate-100 hover:shadow-xl transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all mb-6">
                <Ship size={24} strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-widest mb-4">Anchor</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
                A place to ground yourself and find stability amidst the storms of life.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;