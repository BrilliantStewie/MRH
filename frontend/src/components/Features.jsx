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
    <section className="border-b border-slate-100 bg-white py-16 font-sans text-slate-900 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* --- SECTION HEADER --- */}
        <div className="mb-12 flex flex-col justify-between gap-6 md:mb-20 md:flex-row md:items-end">
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
        <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-b border-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
          {features.map((item, index) => (
            <div 
                key={index} 
                className="group flex min-h-[240px] cursor-default flex-col justify-between p-8 transition-colors duration-500 hover:bg-[#F8F9FA] sm:min-h-[300px] sm:p-10 lg:min-h-[360px] lg:p-16"
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
