import React from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import { Star, Quote, ArrowRight, CheckCircle2 } from 'lucide-react';

const Testimonials = () => {
  const navigate = useNavigate(); // 2. Initialize the hook

  // 3. Create the navigation function
  const handleViewAllReviews = () => {
    navigate('/reviews'); 
    // Scroll to top when navigating
    window.scrollTo(0, 0);
  };

  return (
    // Matching the Header background color: bg-[#F8F9FA]
    <section className="bg-[#F8F9FA] py-24 border-b border-slate-200 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto px-8">
        
        {/* --- SECTION HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
               {/* Accent: Blue-900 to match Header */}
               <div className="h-px w-8 bg-blue-900"></div>
               <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-900">
                 Guest Reflections
               </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-serif text-slate-900 leading-tight">
              A Sanctuary <span className="italic text-slate-400">remembered.</span>
            </h2>
          </div>
          
          {/* DESKTOP BUTTON - Added onClick */}
          <button 
            onClick={handleViewAllReviews}
            className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-blue-900 transition-colors group"
          >
              Read all 500+ Reviews <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* --- EDITORIAL GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          
          {/* 1. LEFT: THE 'HERO' STORY (Featured Review) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
             <div className="relative pt-4">
                <Quote size={80} className="text-blue-100/50 absolute -top-4 -left-6 -z-10" />
                <blockquote className="space-y-8">
                   <p className="text-xl md:text-3xl lg:text-4xl font-serif leading-tight text-slate-900">
                     "The silence here is exactly what I needed. It felt less like a retreat center and more like a spiritual home. The architecture itself invites you to pray."
                   </p>
                   
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-blue-900 font-serif font-bold italic text-xl shadow-sm">
                         M
                      </div>
                      <div>
                          <div className="text-sm font-bold uppercase tracking-wide text-slate-900">Maria Santos</div>
                          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Individual Retreatant</div>
                      </div>
                   </div>
                </blockquote>
             </div>
             
             {/* Verified Badge */}
             <div className="mt-12 pt-8 border-t border-slate-200 hidden lg:flex items-center gap-2 text-xs text-slate-400 font-medium">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span>Verified Stay • October 2023</span>
             </div>
          </div>

          {/* 2. RIGHT: DATA & RECENT FEED */}
          <div className="lg:col-span-5 space-y-10">
             
             {/* The "Scorecard" */}
             <div className="bg-[#0f172a] text-white p-8 rounded-2xl flex items-center justify-between shadow-xl shadow-slate-200">
                <div>
                   <div className="text-4xl font-bold tracking-tight mb-1">4.9<span className="text-slate-500 text-2xl font-light">/5</span></div>
                   <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Based on 120 reviews</div>
                </div>
                <div className="text-right space-y-2">
                   <div className="flex text-amber-400 gap-1">
                      {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" strokeWidth={0} />)}
                   </div>
                   <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Excellent</div>
                </div>
             </div>

             {/* Recent Reviews List */}
             <div className="space-y-8">
                
                <div className="pb-8 border-b border-slate-200 last:border-0 last:pb-0">
                   <div className="flex gap-1 text-amber-500 mb-3">
                      {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" strokeWidth={0} />)}
                   </div>
                   <p className="text-sm text-slate-600 leading-relaxed mb-3 font-light">
                      "A perfect blend of spiritual atmosphere and hotel-quality comfort. Highly recommended for groups."
                   </p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">— John & Sarah Lee</p>
                </div>

                <div className="pb-8 border-b border-slate-200 last:border-0 last:pb-0">
                   <div className="flex gap-1 text-amber-500 mb-3">
                      {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" strokeWidth={0} />)}
                   </div>
                   <p className="text-sm text-slate-600 leading-relaxed mb-3 font-light">
                      "Safe, clean, and accommodating staff. The dormitory facilities were perfect for our youth camp."
                   </p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">— Fr. David</p>
                </div>

             </div>
          </div>

        </div>
        
        {/* MOBILE BUTTON - Added onClick */}
        <div className="mt-12 md:hidden">
            <button 
                onClick={handleViewAllReviews}
                className="w-full py-4 bg-white border border-slate-200 text-slate-900 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-colors"
            >
                Read all Reviews
            </button>
        </div>

      </div>
    </section>
  );
};

export default Testimonials;