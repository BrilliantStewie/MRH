import React from 'react';
import { Leaf, Moon, BookOpen, Coffee } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: <BookOpen strokeWidth={1.5} size={32} />, // Slightly larger icon
      title: "Spiritual Direction",
      description: "Access to our historic chapel and guided reflection with our resident directors."
    },
    {
      icon: <Leaf strokeWidth={1.5} size={32} />,
      title: "Sacred Gardens",
      description: "Two acres of private landscaped grounds designed for meditative walking and silence."
    },
    {
      icon: <Moon strokeWidth={1.5} size={32} />,
      title: "Strict Silence",
      description: "Designated quiet zones and sound-dampened architecture to ensure your peace."
    },
    {
      icon: <Coffee strokeWidth={1.5} size={32} />,
      title: "Organic Dining",
      description: "Wholesome, locally-sourced meals prepared daily by our in-house culinary team."
    }
  ];

  return (
    // CHANGE 1: Increased vertical padding (py-32) for a taller section
    <section className="bg-white py-32 border-b border-slate-100 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* --- SECTION HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-6">
           <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                 <div className="h-px w-8 bg-blue-900"></div>
                 <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-900">
                   Our Pillars
                 </span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-slate-900 leading-tight">
                A Place for <span className="italic text-slate-400">Renewal.</span>
              </h2>
           </div>
           <p className="max-w-md text-slate-500 font-light text-sm md:text-base leading-relaxed mb-2">
              We offer an environment curated for spiritual renewal, mental clarity, and physical rest.
           </p>
        </div>

        {/* --- ARCHITECTURAL GRID LAYOUT --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-b border-slate-100 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {features.map((item, index) => (
            <div 
                key={index} 
                // CHANGE 2: Increased padding (p-12 lg:p-16) and added min-height
                className="group p-12 lg:p-16 min-h-[360px] flex flex-col justify-between hover:bg-[#F8F9FA] transition-colors duration-500 cursor-default"
            >
              <div>
                {/* Icon Container */}
                <div className="mb-8 text-slate-400 group-hover:text-blue-900 transition-colors duration-300">
                    {item.icon}
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-slate-900 mb-4 font-serif group-hover:text-blue-900 transition-colors">
                    {item.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-light group-hover:text-slate-600">
                    {item.description}
                </p>
              </div>

              {/* Decorative line at bottom that grows on hover */}
              <div className="w-0 h-px bg-blue-900 group-hover:w-12 transition-all duration-500 mt-8 opacity-50"></div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Features;