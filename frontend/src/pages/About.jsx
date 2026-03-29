import React from 'react';
// Direct import to ensure the build tool (Vite/Webpack) finds the file
import mrh_about from '../assets/mrh_about.jpg'; 
import { Ship, Sun, Feather, Cross } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 pt-10">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        
        {/* --- HEADER SECTION --- */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Mercedarian <span className="text-blue-600">Retreat House</span>
          </h1>
          <div className="w-28 h-1.5 bg-blue-600 mx-auto rounded-full mb-6"></div>
        </div>
        
        {/* --- SECTION 1: THE SPLIT HERO --- */}
        <div className="mb-32 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8 items-stretch">
          
          {/* Left Block: Image Container */}
          <div className="relative h-[500px] lg:h-auto rounded-[2.5rem] overflow-hidden shadow-2xl group bg-slate-200">
            <img 
              src={mrh_about} 
              alt="Mercedarian Retreat House and Sisters" 
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
              style={{ transitionDuration: "3s" }}
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
          <div className="flex flex-col justify-center rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm sm:p-10 md:p-12 xl:p-16">
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
        <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-3 xl:gap-8">
          <div className="group min-h-[360px] rounded-[2.25rem] border border-slate-100 bg-white p-10 transition-all hover:shadow-xl md:min-h-[390px] md:p-12">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-slate-50 text-slate-400 transition-all group-hover:bg-blue-600 group-hover:text-white">
                <Sun size={28} strokeWidth={1.5} />
            </div>
            <h3 className="mb-4 text-base font-bold uppercase tracking-widest">Clarity</h3>
            <p className="text-base leading-relaxed text-slate-500">
                Spaces filled with natural light to illuminate your path toward spiritual renewal.
            </p>
          </div>

          <div className="group min-h-[360px] rounded-[2.25rem] border border-slate-100 bg-white p-10 transition-all hover:shadow-xl md:min-h-[390px] md:p-12">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-slate-50 text-slate-400 transition-all group-hover:bg-blue-600 group-hover:text-white">
                <Feather size={28} strokeWidth={1.5} />
            </div>
            <h3 className="mb-4 text-base font-bold uppercase tracking-widest">Softness</h3>
            <p className="text-base leading-relaxed text-slate-500">
                An environment designed for quiet movements and gentle reflection.
            </p>
          </div>

          <div className="group min-h-[360px] rounded-[2.25rem] border border-slate-100 bg-white p-10 transition-all hover:shadow-xl md:min-h-[390px] md:p-12">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-slate-50 text-slate-400 transition-all group-hover:bg-blue-600 group-hover:text-white">
                <Ship size={28} strokeWidth={1.5} />
            </div>
            <h3 className="mb-4 text-base font-bold uppercase tracking-widest">Anchor</h3>
            <p className="text-base leading-relaxed text-slate-500">
                A place to ground yourself and find stability amidst the storms of life.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
